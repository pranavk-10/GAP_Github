"""
rag/rag_service.py – Singleton RAG service for ASHA.

Lifecycle:
  - Initialised once at app startup (main.py lifespan)
  - Loads the persisted ChromaDB collection
  - Exposes retrieve() for use in routers/chat.py

Retrieval logic:
  - English-only (callers must check language before calling)
  - Queries ChromaDB with cosine similarity
  - Returns top-k doctor answers only if similarity >= SIMILARITY_THRESHOLD
  - If no good match found → returns empty list (caller falls back to plain Gemini)
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
COLLECTION_NAME      = "medical_kb"
CHROMA_PATH          = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
EMBED_MODEL          = "all-MiniLM-L6-v2"
TOP_K                = 3       # how many docs to retrieve
SIMILARITY_THRESHOLD = 0.45    # cosine distance threshold (lower = more similar in chroma's cosine space)
                                # chroma returns "distance" where 0=identical, 1=orthogonal
                                # so we keep results where distance < SIMILARITY_THRESHOLD
MIN_ANSWER_LENGTH    = 80      # drop answers shorter than this after cleaning (pure boilerplate)


class RAGService:
    """
    Wraps ChromaDB + SentenceTransformer for medical context retrieval.

    Usage:
        rag = RAGService()
        rag.initialise()                      # call once at startup
        contexts = rag.retrieve("my query")   # returns list[str] or []
    """

    def __init__(self):
        self._collection  = None
        self._embedder    = None
        self._ready       = False

    # ── Startup ────────────────────────────────────────────────────────────────

    def initialise(self) -> None:
        """
        Load embedder and ChromaDB.
        Called from main.py lifespan so the app fails fast if deps are missing.
        Silently marks itself as not-ready if the DB has not been ingested yet
        so the app still runs (just without RAG context).
        """
        chroma_path = os.path.abspath(CHROMA_PATH)

        if not os.path.isdir(chroma_path):
            logger.warning(
                "⚠️  RAG: chroma_db not found at %s. "
                "Run `python -m rag.ingest` to build the vector store. "
                "Continuing without RAG.",
                chroma_path,
            )
            return

        try:
            import chromadb
            from sentence_transformers import SentenceTransformer

            logger.info("🧠  RAG: loading embedding model %s …", EMBED_MODEL)
            self._embedder = SentenceTransformer(EMBED_MODEL)

            logger.info("🗄️   RAG: connecting to ChromaDB at %s …", chroma_path)
            client = chromadb.PersistentClient(path=chroma_path)

            try:
                self._collection = client.get_collection(COLLECTION_NAME)
                count = self._collection.count()
                logger.info("✅  RAG: ready — %d docs in collection", count)
                self._ready = True
            except Exception:
                logger.warning(
                    "⚠️  RAG: collection '%s' not found in ChromaDB. "
                    "Run `python -m rag.ingest` first. Continuing without RAG.",
                    COLLECTION_NAME,
                )

        except ImportError as e:
            logger.warning(
                "⚠️  RAG: missing dependency (%s). Continuing without RAG.", e
            )

    @property
    def is_ready(self) -> bool:
        return self._ready

    # ── Boilerplate cleaner ────────────────────────────────────────────────────

    @staticmethod
    def _clean_doctor_answer(text: str) -> str:
        """
        Strip iCliniq platform artifacts from doctor answers before injecting
        into the Gemini prompt.  These artifacts add noise and no medical value:
          - Generic greeting:  "Hi." / "Hello."
          - Platform redirect: "For more information consult a X online"
          - Forum salutation:  "Welcome to Chat Doctor forum."
        """
        import re

        # Remove greeting lines at the start ("Hi.", "Hello.", "Hi,", etc.)
        text = re.sub(r'^(hi|hello)[,.]?\s*', '', text, flags=re.IGNORECASE).strip()

        # Remove iCliniq redirect at the end (may appear as last sentence)
        text = re.sub(
            r'\.?\s*for more information[^.]*consult[^.]*online\.?',
            '', text, flags=re.IGNORECASE
        ).strip()

        # Remove "Welcome to Chat Doctor forum." boilerplate
        text = re.sub(
            r'welcome to chat doctor forum\.?\s*',
            '', text, flags=re.IGNORECASE
        ).strip()

        # Collapse multiple spaces / newlines left behind after removals
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'  +', ' ', text)

        return text.strip()

    # ── Retrieval ──────────────────────────────────────────────────────────────

    def retrieve(self, query: str, top_k: int = TOP_K) -> list[str]:
        """
        Retrieve top-k medically relevant doctor responses for `query`.

        Returns:
            list[str]: List of cleaned Q&A strings (may be empty if no good match
                       or RAG is not ready). Empty list → caller should skip RAG.
        """
        if not self._ready:
            return []

        if not query or not query.strip():
            return []

        try:
            embedding = self._embedder.encode([query.strip()]).tolist()

            results = self._collection.query(
                query_embeddings=embedding,
                n_results=top_k,
                include=["documents", "distances", "metadatas"],
            )

            docs      = results.get("documents", [[]])[0]
            distances = results.get("distances", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]

            good_docs = []
            for doc, dist, meta in zip(docs, distances, metadatas):
                if not (dist < SIMILARITY_THRESHOLD and doc and doc.strip()):
                    continue

                # Clean boilerplate BEFORE deciding whether to keep this doc
                cleaned = self._clean_doctor_answer(doc)

                # Drop answers that are too short after cleaning — pure boilerplate
                if len(cleaned) < MIN_ANSWER_LENGTH:
                    logger.debug(
                        "RAG: dropped short/boilerplate doc (len=%d after clean)", len(cleaned)
                    )
                    continue

                # Format as Q&A pair so Gemini understands WHY the reference is relevant
                patient_q = (meta or {}).get("question", "").strip()
                if patient_q:
                    formatted = f"Patient: {patient_q}\nDoctor: {cleaned}"
                else:
                    formatted = cleaned

                good_docs.append(formatted)

            if good_docs:
                logger.info(
                    "RAG HIT: %d/%d docs kept after clean+filter (query: %.60s…)",
                    len(good_docs), len(docs), query,
                )
            else:
                logger.debug(
                    "RAG: no docs passed threshold+clean — falling back to plain LLM"
                )

            return good_docs

        except Exception as exc:
            logger.error("RAG retrieval error: %s", exc, exc_info=True)
            return []


# ── Module-level singleton ─────────────────────────────────────────────────────
rag_service = RAGService()
