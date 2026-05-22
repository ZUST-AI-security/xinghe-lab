"""add sensitivity_records table

Revision ID: 202605220001
Revises: 202605150001
Create Date: 2026-05-22 00:01:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605220001"
down_revision = "202605150001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sensitivity_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("scan_id", sa.String(length=36), nullable=False),
        sa.Column("algorithm", sa.String(length=50), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("scan_param", sa.String(length=50), nullable=False),
        sa.Column("param_min", sa.Float(), nullable=False),
        sa.Column("param_max", sa.Float(), nullable=False),
        sa.Column("steps", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="running"),
        sa.Column("data_points", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sensitivity_records_id"), "sensitivity_records", ["id"], unique=False)
    op.create_index(op.f("ix_sensitivity_records_user_id"), "sensitivity_records", ["user_id"], unique=False)
    op.create_index(op.f("ix_sensitivity_records_scan_id"), "sensitivity_records", ["scan_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_sensitivity_records_scan_id"), table_name="sensitivity_records")
    op.drop_index(op.f("ix_sensitivity_records_user_id"), table_name="sensitivity_records")
    op.drop_index(op.f("ix_sensitivity_records_id"), table_name="sensitivity_records")
    op.drop_table("sensitivity_records")
