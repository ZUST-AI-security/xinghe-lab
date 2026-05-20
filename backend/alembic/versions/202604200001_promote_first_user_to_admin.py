"""promote first user to admin when no admin exists

Revision ID: 202604200001
Revises: 8c4d5e9f0a12
Create Date: 2026-04-20 15:20:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202604200001"
down_revision = "8c4d5e9f0a12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'admin', is_superuser = true
            WHERE id = (
                SELECT id
                FROM users
                ORDER BY
                    CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
                    created_at ASC,
                    id ASC
                LIMIT 1
            )
            AND NOT EXISTS (
                SELECT 1
                FROM users
                WHERE role = 'admin' OR is_superuser IS TRUE
            )
            """
        )
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'user', is_superuser = false
            WHERE id = (
                SELECT id
                FROM users
                ORDER BY
                    CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
                    created_at ASC,
                    id ASC
                LIMIT 1
            )
            AND role = 'admin'
            AND is_superuser IS TRUE
            """
        )
    )
