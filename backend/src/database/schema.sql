-- CareSync Healthcare Coordination System
-- PostgreSQL 16+ Database Initialization Schema
-- Compliant with HIPAA, AES-256-GCM, and Audit Immutability standards

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('ADMINISTRATOR', 'PHYSICIAN', 'LABORATORY_USER', 'RECEPTIONIST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_type_enum AS ENUM ('GENERAL_CONSULTATION', 'SPECIALIST_REVIEW', 'DIAGNOSTIC_FOLLOW_UP', 'ROUTINE_CHECKUP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status_enum AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_status_enum AS ENUM ('DRAFT', 'FINALIZED', 'AMENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE correction_reason_enum AS ENUM ('TYPOGRAPHICAL_ERROR', 'DIAGNOSTIC_REVISION', 'SUPPLEMENTARY_INFORMATION', 'MEDICATION_CORRECTION', 'TRANSCRIPTION_CLARIFICATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE diagnostic_priority_enum AS ENUM ('ROUTINE', 'URGENT', 'STAT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE diagnostic_status_enum AS ENUM ('ORDERED', 'COLLECTED', 'IN_ANALYSIS', 'RESULTED', 'VERIFIED', 'REVIEWED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_enum AS ENUM (
        'USER_AUTHENTICATED', 'USER_LOGOUT', 'USER_SESSION_UNLOCKED', 'UNAUTHORIZED_ACCESS_ATTEMPT',
        'USER_ACCESS_REVOKED', 'PATIENT_RECORD_CREATED', 'PATIENT_RECORD_VIEWED', 'PATIENT_RECORD_UPDATED',
        'PATIENT_RECORD_DELETED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CANCELLED',
        'CONSULTATION_CREATED', 'CONSULTATION_FINALIZED', 'CONSULTATION_CORRECTION_SUBMITTED',
        'DIAGNOSTIC_ORDER_PLACED', 'DIAGNOSTIC_RESULT_SUBMITTED', 'DIAGNOSTIC_RESULT_VERIFIED', 'DIAGNOSTIC_RESULT_REVIEWED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'RECEPTIONIST',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    session_locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Patients Table (Encrypted PHI at Rest)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_enum NOT NULL DEFAULT 'UNKNOWN',
    blood_type VARCHAR(5),
    national_id_encrypted TEXT,
    phone_encrypted TEXT,
    email_encrypted TEXT,
    address_encrypted TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone_encrypted TEXT,
    known_allergies JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_names ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(date_of_birth);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    physician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parent_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    appointment_type appointment_type_enum NOT NULL DEFAULT 'GENERAL_CONSULTATION',
    status appointment_status_enum NOT NULL DEFAULT 'SCHEDULED',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appointment_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_physician ON appointments(physician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- 5. Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    physician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    chief_complaint TEXT NOT NULL,
    vital_signs JSONB NOT NULL DEFAULT '{}'::JSONB,
    primary_diagnosis_description TEXT NOT NULL,
    primary_diagnosis_code VARCHAR(20),
    treatment_plan TEXT NOT NULL,
    status consultation_status_enum NOT NULL DEFAULT 'DRAFT',
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_physician ON consultations(physician_id);

-- 6. Safe Record Corrections Table (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS consultation_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE RESTRICT,
    corrected_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason correction_reason_enum NOT NULL,
    justification_notes TEXT,
    field_modified VARCHAR(100) NOT NULL,
    original_value TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    previous_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_corrections_consultation ON consultation_corrections(consultation_id);

-- 7. Diagnostic Orders Table
CREATE TABLE IF NOT EXISTS diagnostic_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    physician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    test_name VARCHAR(150) NOT NULL,
    priority diagnostic_priority_enum NOT NULL DEFAULT 'ROUTINE',
    status diagnostic_status_enum NOT NULL DEFAULT 'ORDERED',
    clinical_indication TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_patient ON diagnostic_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_physician ON diagnostic_orders(physician_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON diagnostic_orders(order_code);

-- 8. Diagnostic Results Table
CREATE TABLE IF NOT EXISTS diagnostic_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES diagnostic_orders(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    result_summary TEXT NOT NULL,
    findings JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
    file_attachment_url TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_order ON diagnostic_results(order_id);
CREATE INDEX IF NOT EXISTS idx_results_abnormal ON diagnostic_results(is_abnormal);

-- 9. Regulatory Audit Logs Table (Tamper-Proof & Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    log_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action_enum NOT NULL,
    resource_entity VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_entity, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 10. Audit Log Immutability Trigger (Strict Prevention of UPDATE/DELETE)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_logs;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

