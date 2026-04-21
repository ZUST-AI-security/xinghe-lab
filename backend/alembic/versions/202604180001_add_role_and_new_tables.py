"""add role and new tables

Revision ID: 202604180001
Revises: 202604030646
Create Date: 2026-04-18 00:01:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202604180001"
down_revision = "202604030646"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 用户表增加 role 字段
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(length=20), nullable=False, server_default="user")
        )

    # 将现有 superuser 标记为 admin 角色
    op.execute("UPDATE users SET role = 'admin' WHERE is_superuser IS TRUE")

    # 创建 attack_history 表
    op.create_table(
        "attack_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False, index=True),
        sa.Column("algorithm", sa.String(length=50), nullable=False, index=True),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("success", sa.Boolean(), default=False),
        sa.Column("success_rate", sa.Float(), nullable=True),
        sa.Column("l2_norm", sa.Float(), nullable=True),
        sa.Column("linf_norm", sa.Float(), nullable=True),
        sa.Column("execution_time", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 创建 system_config 表
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(length=100), unique=True, nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("system_config")
    op.drop_table("attack_history")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("role")
