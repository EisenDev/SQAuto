import os
import sys
import uuid
from datetime import datetime

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text, inspect
from apps.api.database import SessionLocal, staging_engine
from apps.api.models import Organization, Project, Job, JobStatus, ComparisonRun

def create_demo_data():
    db = SessionLocal()
    print("Connecting to metadata database...")
    
    # 1. Fetch or create a default organization
    org = db.query(Organization).first()
    if not org:
        org = Organization(
            id=uuid.uuid4(),
            name="Global Retail Corp",
            description="Enterprise organization for global retail migration workspace."
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"Created organization: {org.name} ({org.id})")
    else:
        print(f"Using existing organization: {org.name} ({org.id})")
        
    # 2. Re-create comparison project
    print("\nSetting up Demo SQL Dump Comparison Project...")
    comp_project = db.query(Project).filter(Project.name == "Demo SQL Dump Comparison").first()
    if comp_project:
        # Delete old runs
        db.query(ComparisonRun).filter(ComparisonRun.project_id == comp_project.id).delete()
        db.delete(comp_project)
        db.commit()
        print("Removed old comparison project and runs.")
        
    comp_project = Project(
        id=uuid.uuid4(),
        organization_id=org.id,
        name="Demo SQL Dump Comparison",
        description="Demo workspace highlighting mismatches between PostgreSQL legacy source and MS SQL Server target schema.",
        project_type="comparison"
    )
    db.add(comp_project)
    db.commit()
    db.refresh(comp_project)
    print(f"Created Project: {comp_project.name} ({comp_project.id})")
    
    # Create completed ComparisonRun with rich differences
    comp_run = ComparisonRun(
        id=uuid.uuid4(),
        project_id=comp_project.id,
        source_a_filename="postgres_legacy_prod.sql",
        source_a_original_filename="postgres_legacy_prod.sql",
        source_b_filename="mssql_target_stage.bak",
        source_b_original_filename="mssql_target_stage.bak",
        status="completed",
        result={
            "summary": {
                "source_a_tables": 4,
                "source_b_tables": 4,
                "matched_tables": 3,
                "missing_in_b": 1,
                "missing_in_a": 1,
                "column_mismatches": 2,
                "type_mismatches": 1,
                "primary_key_mismatches": 1,
                "row_count_mismatches": 1,
                "missing_rows": 2,
                "cell_mismatches": 2,
                "needs_review": True
            },
            "sources": {
                "a": {
                    "filename": "postgres_legacy_prod.sql",
                    "dialect": "postgresql",
                    "dialect_confidence": 0.98,
                    "table_count": 4
                },
                "b": {
                    "filename": "mssql_target_stage.bak",
                    "dialect": "sqlserver",
                    "dialect_confidence": 1.0,
                    "table_count": 4
                }
            },
            "differences": {
                "counts": {
                  "matched_tables": 3,
                  "missing_in_b": 1,
                  "missing_in_a": 1,
                  "column_mismatches": 2,
                  "type_mismatches": 1,
                  "primary_key_mismatches": 1,
                  "row_count_mismatches": 1,
                  "missing_rows": 2,
                  "cell_mismatches": 2,
                  "total_mismatches": 8
                },
                "tables": {
                    "matched": ["users", "orders", "products"],
                    "missing_in_b": ["customers"],
                    "missing_in_a": ["categories"]
                },
                "columns": [
                    {"table": "users", "column": "phone_number", "issue": "missing_in_b"},
                    {"table": "orders", "column": "discount_code", "issue": "missing_in_a"}
                ],
                "types": [
                    {"table": "users", "column": "id", "source_a_type": "integer", "source_b_type": "bigint"}
                ],
                "primary_keys": [
                    {"table": "products", "source_a_primary_keys": ["id"], "source_b_primary_keys": ["sku"]}
                ],
                "row_counts": [
                    {"table": "users", "source_a_rows": 300, "source_b_rows": 298}
                ],
                "missing_rows": [
                    {"table": "users", "row_key": [2], "issue": "missing_in_b", "source_a_row": {"id": 2, "username": "bob", "email": "bob@example.com"}},
                    {"table": "users", "row_key": [3], "issue": "missing_in_b", "source_a_row": {"id": 3, "username": "charlie", "email": "charlie@example.com"}}
                ],
                "cells": [
                    {"table": "users", "row_key": [1], "column": "email", "source_a_value": "alice@example.com", "source_b_value": "alice_updated@example.com"},
                    {"table": "products", "row_key": [102], "column": "price", "source_a_value": "89.99", "source_b_value": "99.99"}
                ]
            },
            "validation": {
                "status": "Needs Review",
                "reason": "Found critical type conversion and missing columns. Row-level gaps were detected in matched tables.",
                "confidence": 0.78,
                "related_tables": ["users", "orders", "products"],
                "related_columns": ["id", "phone_number", "discount_code"]
            }
        }
    )
    db.add(comp_run)
    db.commit()
    print(f"Created comparison run: {comp_run.id}")
    
    # 3. Re-create individual migration project
    print("\nSetting up Demo E-Commerce Migration Project...")
    ind_project = db.query(Project).filter(Project.name == "Demo E-Commerce Migration").first()
    if ind_project:
        # Delete old jobs
        db.query(Job).filter(Job.project_id == ind_project.id).delete()
        db.delete(ind_project)
        db.commit()
        print("Removed old individual project and jobs.")
        
    ind_project = Project(
        id=uuid.uuid4(),
        organization_id=org.id,
        name="Demo E-Commerce Migration",
        description="Demo workspace with full staging data, truth explorer, diagnostics, and schema mapping details.",
        project_type="individual"
    )
    db.add(ind_project)
    db.commit()
    db.refresh(ind_project)
    print(f"Created Project: {ind_project.name} ({ind_project.id})")
    
    # Create active completed Job with full profile metadata
    job = Job(
        id=uuid.uuid4(),
        project_id=ind_project.id,
        filename="ecommerce_prod_dump.sql",
        original_filename="ecommerce_prod_dump.sql",
        is_compressed=False,
        file_size=125430,
        status=JobStatus.COMPLETED,
        is_active=True,
        profile={
            "metadata": {
                "dialect": "postgresql",
                "table_count": 3
            },
            "tables": {
                "users": {
                    "name": "users",
                    "primary_keys": ["id"],
                    "columns": [
                        {"name": "id", "type": "INTEGER"},
                        {"name": "username", "type": "VARCHAR(255)"},
                        {"name": "email", "type": "VARCHAR(255)"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                },
                "products": {
                    "name": "products",
                    "primary_keys": ["id"],
                    "columns": [
                        {"name": "id", "type": "INTEGER"},
                        {"name": "title", "type": "VARCHAR(255)"},
                        {"name": "price", "type": "NUMERIC"},
                        {"name": "inventory", "type": "INTEGER"}
                    ]
                },
                "orders": {
                    "name": "orders",
                    "primary_keys": ["id"],
                    "columns": [
                        {"name": "id", "type": "INTEGER"},
                        {"name": "user_id", "type": "INTEGER"},
                        {"name": "total_amount", "type": "NUMERIC"},
                        {"name": "status", "type": "VARCHAR(50)"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                }
            },
            "mapping_state": {
                "users": {
                    "id": {"target": "id", "compatible": True},
                    "username": {"target": "name", "compatible": True},
                    "email": {"target": "email_address", "compatible": True},
                    "created_at": {"target": "signup_date", "compatible": True}
                },
                "products": {
                    "id": {"target": "sku", "compatible": True},
                    "title": {"target": "name", "compatible": True},
                    "price": {"target": "unit_price", "compatible": True},
                    "inventory": {"target": "stock_count", "compatible": True}
                }
            },
            "quality_report": {
                "job_id": None, # Will be set below
                "project_id": str(ind_project.id),
                "duplicate_count": 0,
                "null_risk_count": 1,
                "orphan_fk_count": 1,
                "type_mismatch_count": 0,
                "issues": [
                    {
                        "table": "orders",
                        "issue_type": "Orphan Records",
                        "severity": "high",
                        "affected_rows": 1,
                        "detail": "user_id references missing users ID (references users.id)"
                    },
                    {
                        "table": "products",
                        "issue_type": "Null Violations",
                        "severity": "medium",
                        "affected_rows": 0,
                        "detail": "price is 0% null in sampled rows"
                    }
                ]
            }
        },
        log="[INFO] Starting database restore...\n[INFO] Creating staging schema...\n[INFO] Restoring users table (3 rows)...\n[INFO] Restoring products table (3 rows)...\n[INFO] Restoring orders table (3 rows)...\n[INFO] Database restore completed.\n[INFO] Running static validation profiling...\n[INFO] Source profile generated successfully."
    )
    # Set correct job ID inside cached quality report
    job.profile["quality_report"]["job_id"] = str(job.id)
    
    db.add(job)
    db.commit()
    print(f"Created active staging job: {job.id}")
    
    # 4. Populate Local Staging Database
    print("\nPopulating staging database tables...")
    try:
        with staging_engine.connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS staging"))
            
            conn.execute(text("DROP TABLE IF EXISTS staging.orders CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS staging.products CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS staging.users CASCADE"))
            
            conn.execute(text("""
                CREATE TABLE staging.users (
                    id INT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE staging.products (
                    id INT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    price NUMERIC(10, 2) NOT NULL,
                    inventory INT NOT NULL
                )
            """))
            conn.execute(text("""
                CREATE TABLE staging.orders (
                    id INT PRIMARY KEY,
                    user_id INT,
                    total_amount NUMERIC(10, 2) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Insert mock values
            conn.execute(text("INSERT INTO staging.users (id, username, email) VALUES (1, 'alice', 'alice@example.com')"))
            # Insert Bob and Charlie to trigger orphan checks (since they're missing in target B, let's keep users staging clean)
            conn.execute(text("INSERT INTO staging.users (id, username, email) VALUES (2, 'bob', 'bob@example.com')"))
            conn.execute(text("INSERT INTO staging.users (id, username, email) VALUES (3, 'charlie', 'charlie@example.com')"))
            
            conn.execute(text("INSERT INTO staging.products (id, title, price, inventory) VALUES (101, 'Premium Leather Bag', 120.00, 15)"))
            conn.execute(text("INSERT INTO staging.products (id, title, price, inventory) VALUES (102, 'Wireless Headbox', 89.99, 42)"))
            conn.execute(text("INSERT INTO staging.products (id, title, price, inventory) VALUES (103, 'Mechanical Keyboard', 149.50, 8)"))
            
            conn.execute(text("INSERT INTO staging.orders (id, user_id, total_amount, status) VALUES (5001, 1, 120.00, 'shipped')"))
            conn.execute(text("INSERT INTO staging.orders (id, user_id, total_amount, status) VALUES (5002, 2, 89.99, 'processing')"))
            # Insert order with non-existent user_id=99 to naturally demonstrate orphan foreign keys!
            conn.execute(text("INSERT INTO staging.orders (id, user_id, total_amount, status) VALUES (5003, 99, 149.50, 'completed')"))
            
            conn.commit()
            print("Staging tables populated with mock data.")
    except Exception as e:
        print(f"Error creating staging database tables: {e}")
        
    print("\nDemo data generation complete! Access the SQAuto UI to view:")
    print(f"1. Comparison Project: {comp_project.name} ({comp_project.id})")
    print(f"2. Individual Project: {ind_project.name} ({ind_project.id})")

if __name__ == "__main__":
    create_demo_data()
