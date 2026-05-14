"""add uploaded_files table

Revision ID: 202505140001
Revises: 8c4d5e9f0a12
Create Date: 2025-05-14 00:01:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202505140001"
down_revision = "8c4d5e9f0a12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "uploaded_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_uploaded_files_id"), "uploaded_files", ["id"], unique=False)
    op.create_index(op.f("ix_uploaded_files_user_id"), "uploaded_files", ["user_id"], unique=False)
    op.create_index(op.f("ix_uploaded_files_file_hash"), "uploaded_files", ["file_hash"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_uploaded_files_file_hash"), table_name="uploaded_files")
    op.drop_index(op.f("ix_uploaded_files_user_id"), table_name="uploaded_files")
    op.drop_index(op.f("ix_uploaded_files_id"), table_name="uploaded_files")
    op.drop_table("uploaded_files")
