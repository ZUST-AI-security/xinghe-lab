"""add user profile columns

Revision ID: 202604030646
Revises: 202604030645
Create Date: 2026-04-03 06:46:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202604030646"
down_revision = "202604030645"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("full_name", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("avatar_url", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("bio", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.alter_column(
            "hashed_password",
            existing_type=sa.String(length=100),
            type_=sa.String(length=255),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "hashed_password",
            existing_type=sa.String(length=255),
            type_=sa.String(length=100),
            existing_nullable=False,
        )
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("bio")
        batch_op.drop_column("avatar_url")
        batch_op.drop_column("full_name")
