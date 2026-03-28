"""
rag/ingest.py – One-time script to build the ChromaDB vector store.

Run ONCE from the backend/ directory:
    python -m rag.ingest

Dataset: lavita/ChatDoctor-iCliniq
  Columns: input (patient query), answer_icliniq (real doctor response)
  Size: ~7,321 rows — all rows ingested (full dataset)

What it does:
  1. Downloads lavita/ChatDoctor-iCliniq from HuggingFace
  2. Embeds 'input' (patient text) using all-MiniLM-L6-v2
  3. Stores (patient_text, doctor_response, embedding) into ChromaDB on disk
  4. Persist path: ./chroma_db/  (relative to backend/)
"""

import os
import sys

# ── Constants ──────────────────────────────────────────────────────────────────
DATASET_ID      = "lavita/ChatDoctor-iCliniq"
COLLECTION_NAME = "medical_kb"
CHROMA_PATH     = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
EMBED_MODEL     = "all-MiniLM-L6-v2"
BATCH_SIZE      = 256      # rows per ChromaDB upsert batch


def run():
    # ── Lazy imports ───────────────────────────────────────────────────────────
    try:
        import chromadb
        from datasets import load_dataset
        from sentence_transformers import SentenceTransformer
        from tqdm import tqdm
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install chromadb sentence-transformers datasets tqdm")
        sys.exit(1)

    print(f"📥  Loading dataset: {DATASET_ID} (full split) …")
    ds = load_dataset(DATASET_ID, split="train")
    print(f"✅  Loaded {len(ds):,} rows")
    print(f"🔍  Columns: {ds.column_names}")

    # ── Validate columns ───────────────────────────────────────────────────────
    # lavita/ChatDoctor-iCliniq: input | answer_icliniq | answer_chatgpt | answer_chatdoctor
    Q_COL = "input"
    A_COL = "answer_icliniq"   # real doctor response — most authoritative

    if Q_COL not in ds.column_names or A_COL not in ds.column_names:
        print(f"❌ Expected columns '{Q_COL}' and '{A_COL}' not found.")
        print(f"   Available: {ds.column_names}")
        sys.exit(1)

    # ── Filter: non-empty, minimum length ─────────────────────────────────────
    def is_valid(row):
        q = (row[Q_COL] or "").strip()
        a = (row[A_COL] or "").strip()
        return len(q) >= 20 and len(a) >= 20

    ds = ds.filter(is_valid, num_proc=1)
    print(f"🧹  After filtering: {len(ds):,} rows kept")

    questions = ds[Q_COL]
    answers   = ds[A_COL]

    # ── Load embedding model ───────────────────────────────────────────────────
    print(f"🧠  Loading embedding model: {EMBED_MODEL} …")
    embedder = SentenceTransformer(EMBED_MODEL)

    # ── Init ChromaDB ──────────────────────────────────────────────────────────
    chroma_path = os.path.abspath(CHROMA_PATH)
    os.makedirs(chroma_path, exist_ok=True)
    print(f"🗄️   ChromaDB path: {chroma_path}")

    client     = chromadb.PersistentClient(path=chroma_path)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},   # cosine similarity
    )

    existing = collection.count()
    if existing > 0:
        print(f"⚠️   Collection already has {existing:,} documents.")
        ans = input("   Re-ingest and overwrite? [y/N]: ").strip().lower()
        if ans != "y":
            print("   Skipping ingest. Using existing DB.")
            return
        client.delete_collection(COLLECTION_NAME)
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Embed + upsert in batches ──────────────────────────────────────────────
    total = len(questions)
    print(f"⚙️   Embedding & ingesting {total:,} rows in batches of {BATCH_SIZE} …")

    for start in tqdm(range(0, total, BATCH_SIZE), unit="batch"):
        end       = min(start + BATCH_SIZE, total)
        batch_q   = questions[start:end]
        batch_a   = answers[start:end]
        batch_ids = [f"doc_{start + i}" for i in range(len(batch_q))]

        # Embed patient questions (what we retrieve against at query time)
        embeddings = embedder.encode(batch_q, show_progress_bar=False).tolist()

        collection.upsert(
            ids=batch_ids,
            embeddings=embeddings,
            documents=batch_a,                            # store doctor answer
            metadatas=[{"question": q} for q in batch_q],
        )

    print(f"\n✅  Ingest complete — {collection.count():,} docs in ChromaDB")
    print(f"   Path: {chroma_path}")
    print("\n🚀  You can now start the backend — RAG will be active automatically.")


if __name__ == "__main__":
    run()
