"""Clear all application data rows while keeping schema intact.

Usage:
    uv run python scripts/clear_db.py
    uv run python scripts/clear_db.py --database-url sqlite:///./xinghe_zhi_an.db
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import func, select, text


def _bootstrap_path() -> None:
    backend_root = Path(__file__).resolve().parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clear database rows while keeping schema")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=None,
        help="Override DATABASE_URL for this run only",
    )
    return parser.parse_args()


def _load_db_runtime(database_url: str | None):
    if database_url:
        os.environ["DATABASE_URL"] = database_url

    _bootstrap_path()

    from app.core.database import Base, SessionLocal, engine  # pylint: disable=import-outside-toplevel
    import app.models  # noqa: F401  # pylint: disable=import-outside-toplevel,unused-import

    return Base, SessionLocal, engine


def _existing_table_names(engine) -> set[str]:
    from sqlalchemy import inspect

    return set(inspect(engine).get_table_names())


def _table_counts(session, metadata_tables) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table in metadata_tables:
        counts[table.name] = session.execute(select(func.count()).select_from(table)).scalar_one()
    return counts


def _clear_postgresql(session, metadata_tables) -> None:
    table_names = [f'"{table.name}"' for table in metadata_tables]
    if not table_names:
        return

    session.execute(text(f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE"))


def _clear_generic(session, metadata_tables) -> None:
    # Delete children first to satisfy FK constraints on engines without TRUNCATE CASCADE.
    for table in reversed(metadata_tables):
        session.execute(table.delete())


def main() -> None:
    args = _parse_args()
    Base, SessionLocal, engine = _load_db_runtime(args.database_url)
    existing_names = _existing_table_names(engine)
    metadata_tables = [t for t in Base.metadata.sorted_tables if t.name in existing_names]

    if not metadata_tables:
        print("No existing application tables were found. Nothing to clear.")
        return

    db = SessionLocal()
    try:
        before = _table_counts(db, metadata_tables)
        dialect = engine.dialect.name.lower()

        if dialect == "postgresql":
            _clear_postgresql(db, metadata_tables)
        else:
            _clear_generic(db, metadata_tables)

        db.commit()
        after = _table_counts(db, metadata_tables)

        print(f"Database dialect: {dialect}")
        print("Rows before clear:")
        for name, count in before.items():
            print(f"  - {name}: {count}")

        print("Rows after clear:")
        for name, count in after.items():
            print(f"  - {name}: {count}")

        print("Database data cleared successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
