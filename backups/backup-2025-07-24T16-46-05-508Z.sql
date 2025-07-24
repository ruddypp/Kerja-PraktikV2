--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ActivityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivityType" AS ENUM (
    'LOGIN',
    'ITEM_CREATED',
    'ITEM_UPDATED',
    'ITEM_DELETED',
    'CALIBRATION_CREATED',
    'CALIBRATION_UPDATED',
    'CALIBRATION_DELETED',
    'MAINTENANCE_CREATED',
    'MAINTENANCE_UPDATED',
    'MAINTENANCE_DELETED',
    'RENTAL_CREATED',
    'RENTAL_UPDATED',
    'RENTAL_DELETED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'CUSTOMER_CREATED',
    'CUSTOMER_UPDATED',
    'CUSTOMER_DELETED',
    'REMINDER_CREATED',
    'NOTIFICATION_CREATED'
);


--
-- Name: ItemStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ItemStatus" AS ENUM (
    'AVAILABLE',
    'IN_CALIBRATION',
    'RENTED',
    'IN_MAINTENANCE'
);


--
-- Name: RecurrenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecurrenceType" AS ENUM (
    'MONTHLY',
    'YEARLY'
);


--
-- Name: ReminderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReminderStatus" AS ENUM (
    'PENDING',
    'SENT',
    'ACKNOWLEDGED'
);


--
-- Name: ReminderType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReminderType" AS ENUM (
    'CALIBRATION',
    'RENTAL',
    'SCHEDULE',
    'MAINTENANCE'
);


--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'USER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    type public."ActivityType" NOT NULL,
    action text NOT NULL,
    details text,
    "userId" text NOT NULL,
    "itemSerial" text,
    "rentalId" text,
    "calibrationId" text,
    "maintenanceId" text,
    "affectedUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "customerId" text
);


--
-- Name: Calibration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Calibration" (
    id text NOT NULL,
    "itemSerial" text NOT NULL,
    "userId" text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "calibrationDate" timestamp(3) without time zone NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "certificateNumber" text,
    "certificateUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    notes text,
    "customerId" text,
    fax text
);


--
-- Name: CalibrationCertificate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CalibrationCertificate" (
    id text NOT NULL,
    "calibrationId" text NOT NULL,
    manufacturer text,
    "instrumentName" text,
    "modelNumber" text,
    configuration text,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "customerAddress" text,
    "customerFax" text,
    "customerName" text,
    "customerPhone" text
);


--
-- Name: CalibrationStatusLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CalibrationStatusLog" (
    id text NOT NULL,
    "calibrationId" text NOT NULL,
    status public."RequestStatus" NOT NULL,
    notes text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    "contactName" text,
    "contactPhone" text,
    "contactEmail" text,
    service text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CustomerHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomerHistory" (
    id text NOT NULL,
    "customerId" text NOT NULL,
    action text NOT NULL,
    details text,
    performance double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GasCalibrationEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GasCalibrationEntry" (
    id text NOT NULL,
    "certificateId" text NOT NULL,
    "gasType" text NOT NULL,
    "gasConcentration" text NOT NULL,
    "gasBalance" text NOT NULL,
    "gasBatchNumber" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryCheck; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryCheck" (
    id text NOT NULL,
    name text,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "completedDate" timestamp(3) without time zone,
    notes text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurrenceType" public."RecurrenceType",
    "nextDate" timestamp(3) without time zone
);


--
-- Name: InventoryCheckExecution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryCheckExecution" (
    id text NOT NULL,
    name text,
    date timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    "scheduleId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryCheckExecutionItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryCheckExecutionItem" (
    id text NOT NULL,
    "executionId" text NOT NULL,
    "itemSerial" text NOT NULL,
    verified boolean DEFAULT false NOT NULL
);


--
-- Name: InventoryCheckItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryCheckItem" (
    id text NOT NULL,
    "checkId" text NOT NULL,
    "itemSerial" text NOT NULL,
    "verifiedStatus" public."ItemStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Item" (
    "serialNumber" text NOT NULL,
    name text NOT NULL,
    "partNumber" text NOT NULL,
    sensor text,
    description text,
    "customerId" text,
    status public."ItemStatus" DEFAULT 'AVAILABLE'::public."ItemStatus" NOT NULL,
    "lastVerifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ItemHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ItemHistory" (
    id text NOT NULL,
    "itemSerial" text NOT NULL,
    action text NOT NULL,
    details text,
    "relatedId" text,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Maintenance" (
    id text NOT NULL,
    "itemSerial" text NOT NULL,
    "userId" text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MaintenanceStatusLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MaintenanceStatusLog" (
    id text NOT NULL,
    "maintenanceId" text NOT NULL,
    status public."RequestStatus" NOT NULL,
    notes text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "shouldPlaySound" boolean DEFAULT false NOT NULL,
    "reminderId" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Reminder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reminder" (
    id text NOT NULL,
    type public."ReminderType" NOT NULL,
    status public."ReminderStatus" DEFAULT 'PENDING'::public."ReminderStatus" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "reminderDate" timestamp(3) without time zone NOT NULL,
    "itemSerial" text,
    "calibrationId" text,
    "rentalId" text,
    "scheduleId" text,
    "emailSent" boolean DEFAULT false NOT NULL,
    "emailSentAt" timestamp(3) without time zone,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "maintenanceId" text,
    "acknowledgedAt" timestamp(3) without time zone
);


--
-- Name: Rental; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Rental" (
    id text NOT NULL,
    "itemSerial" text NOT NULL,
    "userId" text NOT NULL,
    "poNumber" text,
    "doNumber" text,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "returnDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "renterName" text,
    "renterPhone" text,
    "renterAddress" text,
    "initialCondition" text,
    "returnCondition" text,
    "customerId" text
);


--
-- Name: RentalStatusLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RentalStatusLog" (
    id text NOT NULL,
    "rentalId" text NOT NULL,
    status public."RequestStatus" NOT NULL,
    notes text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ServiceReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServiceReport" (
    id text NOT NULL,
    "maintenanceId" text NOT NULL,
    "reportNumber" text,
    customer text,
    location text,
    brand text,
    model text,
    "serialNumber" text,
    "dateIn" timestamp(3) without time zone,
    "reasonForReturn" text,
    findings text,
    action text,
    "sensorCO" boolean DEFAULT false NOT NULL,
    "sensorH2S" boolean DEFAULT false NOT NULL,
    "sensorO2" boolean DEFAULT false NOT NULL,
    "sensorLEL" boolean DEFAULT false NOT NULL,
    "lampClean" boolean DEFAULT false NOT NULL,
    "lampReplace" boolean DEFAULT false NOT NULL,
    "pumpTested" boolean DEFAULT false NOT NULL,
    "pumpRebuilt" boolean DEFAULT false NOT NULL,
    "pumpReplaced" boolean DEFAULT false NOT NULL,
    "pumpClean" boolean DEFAULT false NOT NULL,
    "instrumentCalibrate" boolean DEFAULT false NOT NULL,
    "instrumentUpgrade" boolean DEFAULT false NOT NULL,
    "instrumentCharge" boolean DEFAULT false NOT NULL,
    "instrumentClean" boolean DEFAULT false NOT NULL,
    "instrumentSensorAssembly" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ServiceReportPart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ServiceReportPart" (
    id text NOT NULL,
    "serviceReportId" text NOT NULL,
    "itemNumber" integer NOT NULL,
    description text NOT NULL,
    "snPnOld" text,
    "snPnNew" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TechnicalReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TechnicalReport" (
    id text NOT NULL,
    "maintenanceId" text NOT NULL,
    "csrNumber" text,
    "deliveryTo" text,
    "quoNumber" text,
    "dateReport" timestamp(3) without time zone,
    "techSupport" text,
    "dateIn" timestamp(3) without time zone,
    "estimateWork" text,
    "reasonForReturn" text,
    findings text,
    action text,
    "beforePhotoUrl" text,
    "afterPhotoUrl" text,
    "termsConditions" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TechnicalReportPart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TechnicalReportPart" (
    id text NOT NULL,
    "technicalReportId" text NOT NULL,
    "itemNumber" integer NOT NULL,
    "namaUnit" text,
    description text,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" double precision,
    "totalPrice" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TestResultEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TestResultEntry" (
    id text NOT NULL,
    "certificateId" text NOT NULL,
    "testSensor" text NOT NULL,
    "testSpan" text NOT NULL,
    "testResult" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLog" (id, type, action, details, "userId", "itemSerial", "rentalId", "calibrationId", "maintenanceId", "affectedUserId", "createdAt", "customerId") FROM stdin;
9ba11360-8f26-4026-8896-531963fc8208	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 06:34:36.684	\N
3ed4d13d-28e4-4565-a3a1-794024b09c22	CALIBRATION_CREATED	Calibration created	Calibration request created	7362c3dc-c889-41b3-ac13-9cffd518985d	NCZDQ5SRQQ	\N	caea7610-514b-4f41-b348-406e107f774a	\N	\N	2025-07-19 06:35:44.538	\N
2bd5839c-2998-46ff-b8c0-760cbc81b071	CALIBRATION_UPDATED	Calibration updated	Completed calibration for Bespoke Aluminum Chips	7362c3dc-c889-41b3-ac13-9cffd518985d	NCZDQ5SRQQ	\N	caea7610-514b-4f41-b348-406e107f774a	\N	\N	2025-07-19 06:36:06.681	\N
91dc1f7a-33f5-45e7-afc5-230e2f745be0	CALIBRATION_CREATED	Calibration created	Calibration request created	7362c3dc-c889-41b3-ac13-9cffd518985d	VAKXGNHFIG	\N	8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	\N	\N	2025-07-19 06:56:16.087	\N
233bf140-102f-43bd-b65d-d5a7eded5e30	CALIBRATION_UPDATED	Calibration updated	Completed calibration for Awesome Cotton Cheese	7362c3dc-c889-41b3-ac13-9cffd518985d	VAKXGNHFIG	\N	8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	\N	\N	2025-07-19 06:56:33.518	\N
cac642e9-2bb1-4b79-9621-61ec7bd912c2	MAINTENANCE_CREATED	Maintenance created	Admin memulai maintenance untuk barang HKQCIIJTWU	7362c3dc-c889-41b3-ac13-9cffd518985d	HKQCIIJTWU	\N	\N	181191a2-10f8-4579-aeeb-d3febca55690	\N	2025-07-19 09:48:17.293	\N
09b4011f-678b-4339-a2fa-4f5e7e5d9dfb	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Concrete Table (HKQCIIJTWU) oleh admin. CSR No: 1/CSR-PBI/VII/2025, TCR No: 1/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	HKQCIIJTWU	\N	\N	181191a2-10f8-4579-aeeb-d3febca55690	\N	2025-07-19 11:31:56.919	\N
87a54ca9-34f7-4be7-aac0-fa892f148d23	MAINTENANCE_CREATED	Maintenance created	Admin memulai maintenance untuk barang QBSW5IHVUY	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:06:19.128	\N
21df6b00-c799-45fc-8c5e-ae98895a3f5a	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Cotton Soap (QBSW5IHVUY) oleh admin. CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:07:45.406	\N
e665bd4c-6680-4940-a132-5461c3f59775	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Cotton Soap (QBSW5IHVUY) oleh admin. CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:12:18.541	\N
2e88400f-0819-4226-933d-a10197c3dade	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Cotton Soap (QBSW5IHVUY) oleh admin. CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:18:10.263	\N
9aa2f88e-3ac7-4bea-871c-c9cac38dc79e	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Cotton Soap (QBSW5IHVUY) oleh admin. CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:24:19.824	\N
7b08b644-f782-47d6-b064-a24eda8f6f1a	MAINTENANCE_UPDATED	Maintenance updated	Maintenance selesai untuk Awesome Cotton Soap (QBSW5IHVUY) oleh admin. CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	e0091aca-01b8-42f6-8f98-7229a5aa9715	\N	2025-07-19 12:32:26.633	\N
ccc4f665-3b5b-452a-a98b-b5b8b91b2093	RENTAL_CREATED	Created new rental for Awesome Ceramic Car for customer	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	5ZHSDBCGUJ	457b804e-7c86-452d-9d83-4d752c23d988	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 12:34:16.856	db6c0c3a-15b0-4017-a924-af68a549410c
928ec9a5-125e-4f79-b02b-96022f951004	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 14:01:50.29	\N
fd835450-b30a-42fb-8f6e-6583c4101e74	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 14:20:29.644	\N
67657f2e-07a1-4be9-b2b9-b12274637f52	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 14:20:56.896	\N
87389bc9-c80a-4c34-889f-0e3496d449c7	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 14:34:17.507	\N
d35ca96b-cdfb-4dbe-9f5e-deccbfeacf59	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 14:43:58.605	\N
5cb54bd0-ec02-4cb2-89ba-04c3d0af29e6	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-19 15:05:07.018	\N
522673fc-94db-4e8b-b3f2-bbe13848d7f2	LOGIN	User logged in	User User Paramata (USER) logged in	46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	\N	\N	\N	\N	\N	2025-07-20 15:28:31.524	\N
38a63071-090a-4948-b365-5f14a9aaaec1	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:05:40.811	\N
f2bff79b-f9cd-40ae-95a6-602e19a775f2	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:07:18.05	\N
05ec0589-f524-4bff-911b-032cbefcb513	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:18:15.597	\N
edb00191-1ca3-4658-8126-243f9441083c	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:26:40.58	\N
31c280a7-4438-4b3e-a3a5-6eca80b0caf1	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:46:57.412	\N
13356860-7f80-4f6f-bf8a-7f7b3aa925c1	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 16:47:29.766	\N
b57e1337-85b4-42d5-9a59-b98187c7bde0	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 17:11:10.302	\N
3e40cb81-6fdb-416d-a225-35034a2e1c9e	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-20 17:33:43.844	\N
b58b3319-5925-418d-8eb4-2b78a044bb3a	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 03:27:38.12	\N
3846a7c5-748e-4333-9732-12826b4c436e	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 03:29:40.479	\N
33f39190-4c04-4da8-9010-79b58edf8486	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 03:59:26.308	\N
0e56b78b-87fb-4255-a921-19b753af6b4d	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 04:10:31.347	\N
0f6baf22-5270-46aa-8f80-48c5cdd0ddc2	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 07:53:11.588	\N
0bdf88fe-2816-4afd-a36b-b6661aa59132	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-21 08:00:44.454	\N
7bb3d044-27cf-493d-bf82-47ba7406ce66	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 00:55:29.802	\N
61817303-587d-4e91-a2ca-a20e120f2249	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 06:04:18.269	\N
89ab67af-35c9-42c2-ba51-65734df773a1	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "ww" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:13.18	\N
d6807e5b-fbf6-434a-908b-61d51eca18de	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "l" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:14.995	\N
4b6f17d4-d472-4ac8-9d1a-03ca30ae4fa2	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "sss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:17.18	\N
c0b97c83-e626-4947-9171-3af26f993ec8	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "w" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:18.451	\N
3d14e138-d4f8-49a7-b2e0-afff286ec267	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "coba" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:19.302	\N
1f6edb41-5bed-494a-a4ce-c52411baca52	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "posiisi" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:20.266	\N
75d278b9-c1ad-44d0-8236-8ad80c262ca5	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "tesing ke berapa ya" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:21.026	\N
7d1e4d0c-ac89-4f04-8394-c62ff2e890d3	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "a" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:22.496	\N
d49f30b0-926b-44cd-be46-75dd39ca3112	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "tes notif" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:23.335	\N
2c2026a5-f435-4352-89fb-2d79e57b4514	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "aaa" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:24.667	\N
d008be25-2804-4762-a3e7-8bfd8d5272d8	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "ss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:25.348	\N
a03d23c7-e494-4760-8718-aa5c54754609	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "bbufs" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:26.294	\N
1e732314-e0ba-45bb-bcee-d00641f07f15	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "sss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:27.333	\N
3876165e-d136-44a4-ab2b-ea895ed6178b	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "sssqw" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:28.045	\N
d4c9a83b-520d-44f1-8a50-daf319a4891b	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "as" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:29.095	\N
87fad626-0dc9-4bc1-8288-6d1a67b2b433	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "testinggggggg" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:29.965	\N
7d38260a-e292-4cd6-adc0-3dafaa5788ec	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "rudy paningal" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:30.956	\N
8905b25b-2fbf-4ce2-8ee7-0b0f8c71b099	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "mmmm" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:12:32.148	\N
5dd4c25e-3367-424b-bfa4-1a11494c68af	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:07.634	\N
2daa7b30-c344-4329-85e0-4c8f89a99d36	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:09.144	\N
550f9c7d-514d-4314-b24d-caae17cf2bca	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:10.593	\N
31d368fa-baed-44af-a1a6-1f4f35cb3389	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/19/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:12.129	\N
58e6f101-e2da-4730-b50a-ee4dcdf95901	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:13.445	\N
a16bee16-db78-4848-a538-8abd14def08f	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:14.861	\N
0a129041-e2b6-49fe-9d35-a4b7d9081369	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:16.278	\N
bd88ac6e-1aa5-42a5-b71b-ab1cdcdaf284	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:17.687	\N
6fee3b6b-d1ec-4c2e-b251-447d67e98b62	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:18.873	\N
ba4122dd-377a-4c7c-ab2a-bcb66e640857	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:21.071	\N
1614700b-d9f5-467f-ad77-eca03788d909	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/20/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:22.21	\N
ed758aff-5f33-4b52-983b-709a47e3d31b	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:23.472	\N
6955a314-729f-42b2-93b9-2ff12aa7b506	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:25.076	\N
82d23868-d46e-43f1-b1b6-ef0c018c1d22	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:26.462	\N
54a022c9-b62d-4045-8c1b-0a8090e755d9	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:27.972	\N
254cd0a4-d502-4ab4-96e1-351141e0d991	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:29.2	\N
d66b330d-92da-480a-8518-086a1e5e0478	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:31.326	\N
59bb65da-9be4-4761-882e-746d5559447b	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/21/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:32.635	\N
5c0434dc-3f3c-441e-a9dd-bfab87ba6aa9	ITEM_DELETED	DELETED_INVENTORY_CHECK	Deleted inventory check scheduled for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:33.898	\N
d1bdacad-fab0-4222-a36d-fc25bc0a29ca	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:13:48.133	\N
cfdd2b56-ca4b-45ba-8bc3-120479f54e81	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "ss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:44:37.904	\N
95f02069-39ba-4e5f-868d-e4dbd31fa1b5	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:46:36.856	\N
e7ebf1fc-e7da-4a18-ab5d-df3dc6e79939	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 08:57:14.108	\N
c5fe3e39-e5ff-491f-a8e1-184f83a9b32f	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "ryrfd" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 09:00:15.224	\N
540c401e-09a0-4fc8-a3de-efb1e32d417e	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "sss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 09:00:15.963	\N
43be51f9-826d-4847-9c6c-b2bf9c4880a7	RENTAL_CREATED	Reminder acknowledged	Rental reminder for Awesome Ceramic Car (5ZHSDBCGUJ) was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	5ZHSDBCGUJ	\N	\N	\N	\N	2025-07-22 09:00:43.476	\N
3c1b9079-cdfc-4f41-8b0c-b4bab65838a0	MAINTENANCE_CREATED	Reminder acknowledged	Maintenance reminder for Awesome Cotton Soap (QBSW5IHVUY) was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	QBSW5IHVUY	\N	\N	\N	\N	2025-07-22 09:01:02.827	\N
e219f0f0-900a-4443-b5cf-88eb81e5c34d	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 09:01:15.537	\N
f34dc291-cc3c-4c47-b6d2-17245a149f2c	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/31/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 09:02:30.625	\N
b00fc19a-0d0c-41cf-ace3-6798fa692366	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 09:39:20.4	\N
91eb727b-6295-400d-8e81-d15ffebac440	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "kolo" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 11:11:08.727	\N
7afbb2bd-722c-4688-8b91-936d963a667b	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 11:19:21.37	\N
a4c28cdd-7ff6-41ea-b117-6ff001f57d2b	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "testing semoga bisa aamiin" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 11:41:15.548	\N
4889fcd9-1950-445b-93b9-f93b4b705e25	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 11:41:29.503	\N
5f5f84ab-3208-47cb-ace2-09ee3de88203	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 12:02:11.497	\N
f53a65ee-9aa0-479f-a788-cf53a1cc684a	LOGIN	User logged in	User User Paramata (USER) logged in	46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	\N	\N	\N	\N	\N	2025-07-22 12:02:47.58	\N
ea6d1db8-29e7-464c-be15-617a3fefb6e8	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/22/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 12:03:53.792	\N
640b86e8-b6c9-47ad-b9a9-d76d07ed5f46	LOGIN	User logged in	User User Paramata (USER) logged in	46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	\N	\N	\N	\N	\N	2025-07-22 12:26:36.481	\N
905837b7-ba63-4e46-a6eb-3050b5da0902	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 17:58:11.801	\N
fd7d0875-3ab5-480b-8833-c0599e15672f	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "sipsss" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:00:23.067	\N
8ecde5ac-d9a6-47b4-97f6-60c2f8d95295	NOTIFICATION_CREATED	Reminder acknowledged	Schedule reminder for "testing semoga amin" was acknowledged	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:00:23.637	\N
9d3f28cd-9fba-417f-b18b-36cd8358d90a	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/23/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:01:04.186	\N
4b90975f-3e67-4bec-9523-17dfaf214f6e	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:01:25.213	\N
d7d566c0-0431-4441-b5dc-ca949497b03f	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/23/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:09:41.384	\N
8980512c-d70f-4f76-8737-a306bd9fe54a	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:16:44.39	\N
158831bf-b735-4aa1-bd78-f5cb5afd3b26	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/23/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-22 18:17:34.196	\N
7775895b-5a79-4219-a799-72b801e07a6c	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/23/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-23 05:44:18.422	\N
d7a2261c-e91c-4f03-b50e-fd619c99884c	CALIBRATION_CREATED	Calibration created	Calibration request created	7362c3dc-c889-41b3-ac13-9cffd518985d	NZXLK2IUMQ	\N	c03209bf-7eae-457e-bd05-7407983e69c0	\N	\N	2025-07-23 05:51:06.727	\N
743a3dbe-c43e-4059-b8cb-ce92dea55568	CALIBRATION_UPDATED	Calibration updated	Completed calibration for Licensed Aluminum Tuna	7362c3dc-c889-41b3-ac13-9cffd518985d	NZXLK2IUMQ	\N	c03209bf-7eae-457e-bd05-7407983e69c0	\N	\N	2025-07-23 05:53:13.242	\N
ed94ebb9-7525-4adc-b25e-51c2c33087f5	LOGIN	User logged in	User User Paramata (USER) logged in	46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	\N	\N	\N	\N	\N	2025-07-23 05:59:28.538	\N
09d181b1-f71f-42e5-ab01-781061a24db6	LOGIN	User logged in	User Admin Paramata (ADMIN) logged in	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-24 05:42:28.356	\N
82a8e9f3-d5d4-49ee-9cb8-d9ff11fc627a	ITEM_UPDATED	SCHEDULED_INVENTORY	Scheduled new inventory check for 7/24/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	\N	\N	\N	\N	\N	2025-07-24 06:09:13.783	\N
b320a80c-263c-44ff-9ba0-5a88c549d9cd	LOGIN	User logged in	User User Paramata (USER) logged in	46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	\N	\N	\N	\N	\N	2025-07-24 16:32:48.97	\N
\.


--
-- Data for Name: Calibration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Calibration" (id, "itemSerial", "userId", status, "calibrationDate", "validUntil", "certificateNumber", "certificateUrl", "createdAt", "updatedAt", notes, "customerId", fax) FROM stdin;
caea7610-514b-4f41-b348-406e107f774a	NCZDQ5SRQQ	7362c3dc-c889-41b3-ac13-9cffd518985d	COMPLETED	2025-07-19 00:00:00	2026-08-26 00:00:00	1/CAL-PBI/VII/2025	\N	2025-07-19 06:35:44.503	2025-07-19 06:36:06.171	dd	97f532a5-3cce-42cb-82bb-01856aa3dc2d	2
8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	VAKXGNHFIG	7362c3dc-c889-41b3-ac13-9cffd518985d	COMPLETED	2025-07-19 00:00:00	2026-07-19 00:00:00	2/CAL-PBI/VII/2025	\N	2025-07-19 06:56:16.067	2025-07-19 06:56:33.439	e	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	\N
c03209bf-7eae-457e-bd05-7407983e69c0	NZXLK2IUMQ	7362c3dc-c889-41b3-ac13-9cffd518985d	COMPLETED	2025-07-23 00:00:00	2026-07-22 00:00:00	3/CAL-PBI/VII/2025	\N	2025-07-23 05:51:06.682	2025-07-23 05:53:13.092	woy	8f929a23-d481-498d-99a8-b1060c398f07	swwe
\.


--
-- Data for Name: CalibrationCertificate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CalibrationCertificate" (id, "calibrationId", manufacturer, "instrumentName", "modelNumber", configuration, "approvedBy", "createdAt", "updatedAt", "customerAddress", "customerFax", "customerName", "customerPhone") FROM stdin;
0a0890b0-ecab-4ef1-9281-9159c77b9882	caea7610-514b-4f41-b348-406e107f774a	Bespoke Aluminum Chips	Bespoke Aluminum Chips	NYFJSM5L	Pressure	rudy	2025-07-19 06:36:06.632	2025-07-19 06:36:06.632	44245 Kemmer Crest	\N	Ebert - Berge	392.687.2048 x566
a901482c-0738-4972-a009-9e61c142ccc9	8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	Awesome Cotton Cheese	Awesome Cotton Cheese	Q5VKS4WH	Humidity	ryd	2025-07-19 06:56:33.483	2025-07-19 06:56:33.483	43733 Cummings Burg	\N	Bradtke, Rowe and Rippin	(406) 855-5261
2f718e8a-2d3e-43ec-8e7e-e2af3f7b73c0	c03209bf-7eae-457e-bd05-7407983e69c0	Licensed Aluminum Tuna	Licensed Aluminum Tuna	ABNGD3V3	Temperature	rudy	2025-07-23 05:53:13.158	2025-07-23 05:53:13.158	248 Johnson Street	\N	Wisozk, Lang and Mayer	(553) 970-3204
\.


--
-- Data for Name: CalibrationStatusLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CalibrationStatusLog" (id, "calibrationId", status, notes, "userId", "createdAt") FROM stdin;
bf5c711b-f2bc-406b-b069-4606c5ecee1d	caea7610-514b-4f41-b348-406e107f774a	COMPLETED	Calibration completed. Certificate number: 1/CAL-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 06:36:06.664
97523c2d-4625-4527-8bb0-dd8608f8e8e0	8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	COMPLETED	Calibration completed. Certificate number: 2/CAL-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 06:56:33.508
e2fe614c-0820-4250-9d68-b93ad4e30f49	c03209bf-7eae-457e-bd05-7407983e69c0	COMPLETED	Calibration completed. Certificate number: 3/CAL-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-23 05:53:13.211
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Customer" (id, name, address, "contactName", "contactPhone", "contactEmail", service, "isDeleted", "createdAt", "updatedAt") FROM stdin;
c81130dc-a3b0-4fc4-9973-298bb0baa2dd	Kassulke - Powlowski	85781 Velma Stravenue	Dr. Charles Runte	1-750-495-2516 x41719	Adalberto_Green@yahoo.com	Stand-alone reciprocal emulation	f	2025-07-19 06:29:22.101	2025-07-19 06:29:22.093
825a8f71-6ba5-4319-b627-1e7c147445a5	Maggio - Mertz	8262 Yost Club	Flora Feil	(728) 842-0312	Benedict_Hudson@yahoo.com	Focused reciprocal firmware	f	2025-07-19 06:29:22.112	2025-07-19 06:29:22.109
467186c0-b763-4f66-aef0-5d39e3a70b66	Blanda, Powlowski and Zboncak	73528 Elijah Skyway	Vanessa Cormier	518.768.7779 x3871	Wava.Brekke@yahoo.com	Progressive incremental support	f	2025-07-19 06:29:22.116	2025-07-19 06:29:22.113
f7a281c3-d025-47b2-944b-8e656a89af1a	Weissnat - Heathcote	691 Luther Pine	Joan Emmerich	(491) 887-4497 x8194	Chaim.Schiller@hotmail.com	Customizable disintermediate parallelism	f	2025-07-19 06:29:22.119	2025-07-19 06:29:22.117
0f245e57-bddc-42c7-9cda-28967da55b0f	Beahan, Wilderman and Kreiger	5087 Eduardo Manors	Harriet Marquardt	1-570-484-8421 x9205	Harold95@yahoo.com	Realigned impactful middleware	f	2025-07-19 06:29:22.123	2025-07-19 06:29:22.12
0c43f622-4d04-491f-b289-afb8fe8fdbe5	Kemmer, Hermiston and Spinka	44627 Ebert Neck	Desiree Runte	784-329-1031	Molly_Jerde92@gmail.com	Focused demand-driven benchmark	f	2025-07-19 06:29:22.127	2025-07-19 06:29:22.125
1bf6ba56-1635-45d2-8106-68e09809928f	Schuster Inc	355 W Washington Avenue	Matthew Bogisich	1-260-852-5220 x226	Roxanne_Tromp97@gmail.com	Triple-buffered coherent middleware	f	2025-07-19 06:29:22.131	2025-07-19 06:29:22.128
4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	Frami - O'Reilly	997 Second Avenue	Dan Powlowski	(809) 599-2152 x77051	Sylvia93@gmail.com	Fundamental systematic adapter	f	2025-07-19 06:29:22.134	2025-07-19 06:29:22.132
97f532a5-3cce-42cb-82bb-01856aa3dc2d	Ebert - Berge	44245 Kemmer Crest	Brandon Boehm	392.687.2048 x566	Grace_Carroll@yahoo.com	Focused fault-tolerant matrix	f	2025-07-19 06:29:22.137	2025-07-19 06:29:22.135
305d13c2-e0d7-4b41-bc16-191ad1f5158b	Jakubowski - Kulas	504 Jefferson Avenue	Iris Adams	1-658-203-8303	Owen.Crist@hotmail.com	Smart value-added protocol	f	2025-07-19 06:29:22.143	2025-07-19 06:29:22.138
e7dce8a5-0edb-42a9-8d27-807783ae3882	Gutkowski, Mitchell and Howe	834 Keebler Throughway	Irma Bruen	348-552-3957 x26573	Dulce61@gmail.com	Visionary asynchronous capability	f	2025-07-19 06:29:22.15	2025-07-19 06:29:22.147
4e722808-9aaa-4af0-b952-dd530fa1a69c	Collier, Gleason and Renner	771 Dahlia Stream	Ms. Cecilia Langosh	1-264-345-9728 x2893	Madelynn_Robel93@yahoo.com	Upgradable high-level model	f	2025-07-19 06:29:22.155	2025-07-19 06:29:22.152
7622ff60-636e-487f-9c37-d4e1b8afdcb4	Gutmann - Zulauf	39609 Prohaska Extensions	Miss Vivian Feeney II	(819) 399-8941	Lamar.Hettinger@hotmail.com	Digitized interactive alliance	f	2025-07-19 06:29:22.158	2025-07-19 06:29:22.156
3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	Skiles Group	418 N Pearl Street	Ronald Hirthe DDS	735-200-8417 x817	Thelma.Lehner@yahoo.com	Upgradable incremental throughput	f	2025-07-19 06:29:22.161	2025-07-19 06:29:22.159
171f2231-319d-4c9c-ad3d-32afb06b9c55	Trantow Inc	31569 E Bridge Street	Jermaine Pagac IV	452-918-1958	Harry_Farrell@gmail.com	Intuitive heuristic access	f	2025-07-19 06:29:22.164	2025-07-19 06:29:22.162
5c1e421b-1407-456e-a789-b7d4dc0caa5e	Rath, Torp and Bergnaum	9396 Ollie Views	Elisa O'Keefe MD	1-578-808-9096 x55964	Ignacio_OConnell@yahoo.com	Centralized secondary parallelism	f	2025-07-19 06:29:22.166	2025-07-19 06:29:22.164
ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	Reichel - Abshire	45958 Vince Rue	Spencer Greenholt	1-478-321-3803 x358	Elise_Smitham66@yahoo.com	Robust context-sensitive system engine	f	2025-07-19 06:29:22.168	2025-07-19 06:29:22.166
78469888-1431-4e5b-90e5-087bd324891c	Erdman Inc	477 Larson Fort	Bernadette Wehner	(605) 333-9049	Kathleen_Cruickshank@hotmail.com	Monitored next generation alliance	f	2025-07-19 06:29:22.182	2025-07-19 06:29:22.179
0f19ddab-436c-4c1e-8641-c9309ae7598f	Kuvalis - Beatty	95021 Rebecca Dam	Rosemary Gibson	(768) 317-2848	Ashly_Bruen@gmail.com	Reduced national methodology	f	2025-07-19 06:29:22.187	2025-07-19 06:29:22.185
9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	Roob, Treutel and Morissette	421 Morar Junctions	Kendra Parker III	1-807-535-3039 x34076	Ally.Pfannerstill84@gmail.com	Sharable impactful project	f	2025-07-19 06:29:22.191	2025-07-19 06:29:22.188
ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	Cruickshank LLC	6448 Freddy Fork	Lisa Torphy	(589) 938-6827 x2630	Stan82@gmail.com	Streamlined human-resource circuit	f	2025-07-19 06:29:22.195	2025-07-19 06:29:22.192
dde62ce2-604d-4ca4-8aeb-ca5d785ec546	Feil - O'Kon	43193 S Grand Avenue	Celia Wiegand	391-734-6935 x87086	Neil_Strosin16@hotmail.com	Synchronised holistic array	f	2025-07-19 06:29:22.198	2025-07-19 06:29:22.196
660fd5e4-3f8f-41a6-90f1-9f8dbe728842	Gleichner and Sons	8453 Gust Turnpike	Brendan Franey II	(770) 924-8425 x6574	Meredith_McGlynn@hotmail.com	Fundamental intangible customer loyalty	f	2025-07-19 06:29:22.2	2025-07-19 06:29:22.198
5ac34043-94f7-439c-b245-05a94cbd7939	Konopelski, Nitzsche and Sauer	8125 Cecil Hollow	Darren Flatley	682.610.0528 x181	Willy31@gmail.com	Exclusive zero trust forecast	f	2025-07-19 06:29:22.202	2025-07-19 06:29:22.2
9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	Kertzmann and Sons	64646 Marvin Roads	Francis Rogahn	613.732.3784 x4474	Jayde_Boyer88@yahoo.com	User-friendly needs-based solution	f	2025-07-19 06:29:22.205	2025-07-19 06:29:22.203
016e52aa-936d-40e5-8ed8-6986eb7b94d2	Collier Inc	46050 Gianni Extension	Rodney Moen	719-300-1249 x1223	Cayla.Johns37@gmail.com	Realigned modular framework	f	2025-07-19 06:29:22.208	2025-07-19 06:29:22.205
d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	Wunsch Group	447 S Mill Street	Scott Kunze-Boehm	1-728-829-7537 x327	Enoch79@gmail.com	Advanced composite microservice	f	2025-07-19 06:29:22.211	2025-07-19 06:29:22.208
0a8d037d-1249-491e-8246-c69b72016b32	Berge Inc	7934 Kuphal Mews	Jack Hermiston	(389) 790-3522	Garrett_Glover41@hotmail.com	Optimized local implementation	f	2025-07-19 06:29:22.213	2025-07-19 06:29:22.211
a6b64257-eedb-4257-adc2-20edb25c72e3	Gusikowski - Labadie	925 Hayes Bypass	Lester Russel	435.265.6580 x93786	Dayne_Orn@yahoo.com	Profound modular matrices	f	2025-07-19 06:29:22.217	2025-07-19 06:29:22.214
a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	Rosenbaum, Macejkovic and Mayert	98669 Larry Extension	Mrs. Clara Howe	256.205.7078	Davin_Schumm@hotmail.com	Self-enabling value-added help-desk	f	2025-07-19 06:29:22.219	2025-07-19 06:29:22.217
71ff3cf3-745b-439e-84c7-22d5a38ab14b	Heidenreich, Terry and Flatley	89671 Parker Lakes	Jonathan Wilderman	1-331-733-5611 x1189	Nova.Christiansen59@yahoo.com	Phased zero defect success	f	2025-07-19 06:29:22.221	2025-07-19 06:29:22.219
266afc86-ab3c-4ca5-9730-62cb935de16a	Hammes, Heaney and Kirlin	4853 Kuphal Stravenue	Carmen Runolfsson	288-315-4559	Dessie_Kulas18@gmail.com	Diverse fault-tolerant budgetary management	f	2025-07-19 06:29:22.226	2025-07-19 06:29:22.223
96077a80-258a-4c59-99d6-757b7078234f	Casper, Littel and Boyle	4406 Heathcote Stream	Dr. Roman Gutkowski	(287) 884-1117 x2963	Lisandro.Mante56@gmail.com	Decentralized logistical installation	f	2025-07-19 06:29:22.228	2025-07-19 06:29:22.226
ece6754c-4cf1-4838-9f1a-5f79babb12f5	Pouros Group	451 O'Conner Cove	Julie Langosh DDS	(546) 993-9078 x67439	Ambrose_Wiza@yahoo.com	Balanced methodical contingency	f	2025-07-19 06:29:22.231	2025-07-19 06:29:22.228
9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	Lehner, Pollich and Heller	79185 E 5th Street	Lydia Mohr PhD	(820) 734-5024 x1225	Mackenzie26@hotmail.com	Team-oriented 24/7 moratorium	f	2025-07-19 06:29:22.233	2025-07-19 06:29:22.231
c3b2b7c3-b062-4964-a956-41e5a9be0f4a	Hudson LLC	904 Reichel Spring	Janis Rodriguez	883-822-5517 x38276	Santa.Schulist10@hotmail.com	Open-architected context-sensitive focus group	f	2025-07-19 06:29:22.236	2025-07-19 06:29:22.233
750c013e-376a-4a36-96a6-d3742cb5b48a	Stiedemann, Pfannerstill and Kshlerin	54481 Jewell Highway	Casey Roob	1-860-748-8265 x72280	Briana.Ritchie16@gmail.com	Visionary homogeneous protocol	f	2025-07-19 06:29:22.238	2025-07-19 06:29:22.236
c165911b-9faa-4be9-8488-819df5754e8f	Ebert - Boehm	768 Vandervort Throughway	Don Adams	912.685.6094 x6112	Elfrieda_Dare@hotmail.com	Devolved client-server intranet	f	2025-07-19 06:29:22.242	2025-07-19 06:29:22.239
44918f04-a92b-4a8a-abc4-7ebd8b957179	Mitchell LLC	8279 Cayla Cliffs	Erin Hansen V	1-732-224-3710 x0489	Vicky.Bruen@gmail.com	Total scalable challenge	f	2025-07-19 06:29:22.245	2025-07-19 06:29:22.243
7cc2b825-04a8-4101-a387-e72cbc8619e7	Goyette Inc	69602 The Glebe	Mr. Russell Beier V	1-858-200-3195 x964	Bradly90@hotmail.com	Horizontal holistic infrastructure	f	2025-07-19 06:29:22.248	2025-07-19 06:29:22.246
8ef3dea6-94f6-430f-9099-58b50119b5e6	Lockman, Schmidt and Hartmann	778 Winona Glen	Cora Cartwright	299.241.1981 x9805	Guillermo26@yahoo.com	Compatible full-range emulation	f	2025-07-19 06:29:22.25	2025-07-19 06:29:22.248
91daed9d-f215-4f02-889b-78394905cebe	Miller, Adams and Reynolds	8575 Brain Field	Bonnie Schuppe	(806) 684-0809 x197	Marjolaine.Veum39@gmail.com	Public-key regional analyzer	f	2025-07-19 06:29:22.253	2025-07-19 06:29:22.251
9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	Harber Inc	961 Elton Inlet	Roxanne Kub	(902) 386-6593 x7165	Asha_Nicolas83@hotmail.com	Implemented reciprocal synergy	f	2025-07-19 06:29:22.255	2025-07-19 06:29:22.253
f7073e7f-c47f-4765-84a2-7287f610694f	Skiles - Borer	72222 New Road	Arlene Feil	666-879-2659 x1575	Elfrieda_Schoen37@hotmail.com	Ergonomic uniform internet solution	f	2025-07-19 06:29:22.261	2025-07-19 06:29:22.258
2050b343-c3fa-43e0-9b85-5a879755e599	Moen, Carroll and Schmidt	2292 Third Avenue	Deborah Heaney	(943) 953-2297 x717	Emmie.Bogisich@yahoo.com	User-friendly holistic portal	f	2025-07-19 06:29:22.268	2025-07-19 06:29:22.265
e12fb19e-037c-4f02-93b4-ea014d16e151	Lueilwitz - Block	3689 Stevie Streets	Janie Johnston	(629) 816-3864	Hallie17@yahoo.com	Organic static service-desk	f	2025-07-19 06:29:22.271	2025-07-19 06:29:22.269
3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	Conn - Reynolds	567 Muller Roads	Myron Baumbach	(351) 905-0152	Peter.Lowe@hotmail.com	Horizontal analyzing microservice	f	2025-07-19 06:29:22.275	2025-07-19 06:29:22.272
c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	Sporer - Hansen	865 Highfield Close	Janie Gerhold	1-316-357-2525	Jaydon.Schmidt@hotmail.com	Customizable optimal knowledge base	f	2025-07-19 06:29:22.28	2025-07-19 06:29:22.277
44a549f1-09c9-4591-ad39-3c676a5c2331	Jast Group	55285 Yundt Throughway	Guy Hane MD	1-865-528-0840	Olga60@hotmail.com	Adaptive context-sensitive pricing structure	f	2025-07-19 06:29:22.282	2025-07-19 06:29:22.28
1892cdc3-ec61-4385-867e-a8e339ff6a11	Waters - Fadel	105 Mitchel Walk	Clarence Blanda	441-491-6360	Janis_Schmitt@yahoo.com	Customizable stable protocol	f	2025-07-19 06:29:22.284	2025-07-19 06:29:22.282
e993b1e9-4b62-44bd-bd0f-ff670d9574d3	Reichert, Gusikowski and Bergnaum	12373 Maye Knoll	Brenda Feeney	898.540.4450	Edwin_Koss@hotmail.com	Diverse clear-thinking architecture	f	2025-07-19 06:29:22.286	2025-07-19 06:29:22.284
b7ab53de-8620-4966-af52-7bd8b6626da6	Windler - Jacobi	25941 Evangeline Shoals	Aaron Frami	(690) 686-0846 x113	Rudy_Braun9@gmail.com	Extended content-based parallelism	f	2025-07-19 06:29:22.29	2025-07-19 06:29:22.287
b57aed4c-9d39-47a7-982b-5b80b1b05cda	Thiel, Hammes and Schuppe	718 Grimes Walk	Beulah Rowe	1-749-532-0791 x40612	Sylvan31@hotmail.com	User-centric well-modulated workforce	f	2025-07-19 06:29:22.297	2025-07-19 06:29:22.294
f5a9bfb7-826e-47b6-af43-b29457ec2e0c	Bradtke, Rowe and Rippin	43733 Cummings Burg	Dr. Lowell Lehner	(406) 855-5261	Marcella_Wisozk@hotmail.com	Polarised actuating emulation	f	2025-07-19 06:29:22.302	2025-07-19 06:29:22.299
7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	Bode - Price	57106 Jovani Center	Eloise Bergstrom I	887-875-0959	Rosalyn_Cole@hotmail.com	Proactive dynamic throughput	f	2025-07-19 06:29:22.305	2025-07-19 06:29:22.302
61b4f011-ccf8-4016-b677-f3d5fbf4eb6b	MacGyver, Hammes and Roberts	4934 Leslie Row	Rickey Ebert-Moore	311-903-1193	Maddison.Mitchell86@gmail.com	Customer-focused tangible algorithm	f	2025-07-19 06:29:22.307	2025-07-19 06:29:22.305
1cea7c08-fb2d-482d-a108-447cfdd4ba7a	Rolfson, Carroll and Spencer	23490 Sipes Road	Dr. Russell Heathcote	342.448.8662	Brenden_Veum29@hotmail.com	Monitored contextually-based parallelism	f	2025-07-19 06:29:22.31	2025-07-19 06:29:22.308
5027d968-6a10-428e-9e71-265a49548124	Aufderhar, Moore and Wyman	5874 Elsa Stream	Miss Kellie Luettgen	503-405-8588 x5652	Jerald73@gmail.com	Focused systematic generative AI	f	2025-07-19 06:29:22.313	2025-07-19 06:29:22.311
f54e4a56-7c29-4d58-bdfd-23001d9b14cf	Rau - Wintheiser	235 Quigley Pine	Myron Konopelski	433-725-7590 x8388	Iva_Quitzon@gmail.com	Streamlined regional analyzer	f	2025-07-19 06:29:22.315	2025-07-19 06:29:22.313
18c611c1-7203-4900-a66e-9ef9e1bc1605	Ward Inc	2665 N 6th Street	Roland Daugherty	625-950-2620	Lavinia.Thiel13@hotmail.com	Face to face clear-thinking strategy	f	2025-07-19 06:29:22.317	2025-07-19 06:29:22.315
8f929a23-d481-498d-99a8-b1060c398f07	Wisozk, Lang and Mayer	248 Johnson Street	Marcus Shields	(553) 970-3204	Agustin_Herzog40@yahoo.com	Persistent optimal collaboration	f	2025-07-19 06:29:22.324	2025-07-19 06:29:22.321
fff000fb-b8c6-44f4-9a53-6818908fe490	Roob - Armstrong	9869 Emanuel Haven	Elaine Quigley IV	1-793-681-0574 x13531	Muhammad89@yahoo.com	Synchronised tertiary hub	f	2025-07-19 06:29:22.33	2025-07-19 06:29:22.328
539b52b6-288c-420c-a5f9-f98c9ce4bbf0	Durgan - Price	83572 Ward Union	Kristopher Greenfelder DVM	(622) 387-2521	Syble_Leffler@hotmail.com	Versatile methodical data-warehouse	f	2025-07-19 06:29:22.333	2025-07-19 06:29:22.331
90c3c103-fc83-49a3-a48e-f1d18c1f6b40	Sipes and Sons	27573 Honeysuckle Close	Wilbur Carter	1-418-457-2689 x714	Lenny_Gerlach@gmail.com	Centralized logistical toolset	f	2025-07-19 06:29:22.336	2025-07-19 06:29:22.334
11c7abc6-4793-4d64-b186-a8ce58be79a5	Johnson - Rohan	34167 Long Lane	Dora Weimann	(308) 643-8728 x1490	Jarrell42@hotmail.com	Polarised composite forecast	f	2025-07-19 06:29:22.338	2025-07-19 06:29:22.336
4b10a897-6e67-497e-bf21-9250df6799ff	Conn Inc	2463 Romaguera Mews	Frank Ferry	561-761-5885 x653	Heloise_Botsford94@yahoo.com	Optional zero tolerance knowledge user	f	2025-07-19 06:29:22.34	2025-07-19 06:29:22.338
fda1c3fe-8d63-4c68-b431-dfbaa670d378	Aufderhar - Watsica	8233 Railroad Street	Muriel Beer	(956) 876-1006 x82119	Vidal_Veum@hotmail.com	Proactive neutral leverage	f	2025-07-19 06:29:22.343	2025-07-19 06:29:22.341
b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	Gerlach, Mraz and Beahan	863 Elinore Underpass	Roxanne Douglas	766-632-5124 x8234	Roy_Price@yahoo.com	Organized dynamic artificial intelligence	f	2025-07-19 06:29:22.346	2025-07-19 06:29:22.343
c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	Greenfelder - Hegmann	7975 Leanna Plaza	Julio Powlowski	(379) 634-7015 x281	Eino57@hotmail.com	Implemented bifurcated productivity	f	2025-07-19 06:29:22.348	2025-07-19 06:29:22.346
e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	Hoppe, Tromp and Conn	76801 Barney Grove	Olivia Ondricka	(488) 911-8708 x0818	Augusta2@hotmail.com	Profound high-level strategy	f	2025-07-19 06:29:22.35	2025-07-19 06:29:22.348
fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	Mayer, Rodriguez and Murazik	2470 N Central Avenue	Melody Block	1-370-563-5945 x32129	Dalton13@gmail.com	Future-proofed dynamic knowledge user	f	2025-07-19 06:29:22.352	2025-07-19 06:29:22.35
84c5139d-a39f-4835-a2cf-a8e4a2023c65	Jacobson - Hagenes	379 Abbott Extensions	Olive Aufderhar	619.462.2280	Toney_Fahey19@hotmail.com	Implemented coherent core	f	2025-07-19 06:29:22.354	2025-07-19 06:29:22.352
43caa677-b0cd-4abc-98d8-204728a50adb	Kiehn Group	529 Kuvalis Points	Ellis Bogan	974-371-4943 x337	Amie_Gottlieb23@hotmail.com	Integrated bottom-line website	f	2025-07-19 06:29:22.362	2025-07-19 06:29:22.359
1e6191ec-661c-487f-9b91-e0ebde37ff09	Klocko - Blick	9287 Domenick Harbor	Dr. Katherine Little	(758) 501-2366 x4629	Saige.Wintheiser63@gmail.com	Grass-roots sustainable capacity	f	2025-07-19 06:29:22.366	2025-07-19 06:29:22.364
ba66d600-62a1-40bd-a49c-2a3a7bf54013	Lockman - Zemlak	6267 Medhurst Garden	Guy Hermann	1-961-322-2914	Kianna.Hauck19@yahoo.com	Cross-platform human-resource solution	f	2025-07-19 06:29:22.37	2025-07-19 06:29:22.367
cad13380-5afa-4e75-8d58-46f57f70abcf	Schmitt - Brekke	560 Ward Track	Melanie Gutkowski	686-785-4083	Elmore55@gmail.com	User-centric logistical projection	f	2025-07-19 06:29:22.372	2025-07-19 06:29:22.37
5c7c6737-f829-4197-9ad0-7d3934769671	Carroll Inc	5132 Zboncak Fork	Essie Sanford	570-581-9441 x62897	Albertha.Quigley@hotmail.com	Sustainable AI-powered core	f	2025-07-19 06:29:22.376	2025-07-19 06:29:22.373
5b1c263b-2692-481f-b203-3f576e5599c3	McLaughlin, Hills and Swift	3797 Railroad Street	Ms. Peggy Kreiger	607-835-3291 x025	Randall_Wolff99@hotmail.com	Profound tangible archive	f	2025-07-19 06:29:22.378	2025-07-19 06:29:22.376
4f915d76-f32d-4744-a63e-9f8abbca15e8	Rodriguez Inc	73266 Windsor Drive	Dr. Sergio Watsica	(907) 740-9182	Dan49@hotmail.com	Integrated bottom-line project	f	2025-07-19 06:29:22.38	2025-07-19 06:29:22.378
db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	Zulauf - Flatley	24663 State Road	Ms. Amber Murazik	1-949-428-6494 x11185	Nannie_Kuhlman43@yahoo.com	AI-driven sustainable strategy	f	2025-07-19 06:29:22.383	2025-07-19 06:29:22.381
8ad57719-e332-4791-b279-945394515b36	Nader - Miller	56122 Carter Summit	Ray Schultz	(694) 279-8712 x300	Arianna25@yahoo.com	Innovative sustainable circuit	f	2025-07-19 06:29:22.386	2025-07-19 06:29:22.383
5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	Quitzon, McLaughlin and Pfannerstill	447 Stroman Fords	Joseph Walsh	(954) 958-1227	Krystina_Kuhn38@gmail.com	Multi-tiered asynchronous forecast	f	2025-07-19 06:29:22.396	2025-07-19 06:29:22.392
629ed9be-15cc-4a22-8b82-0f027805b60c	Volkman, Ankunding and Paucek	4459 Cow Lane	Lisa Heidenreich	1-565-975-9629 x2025	Neha.Zieme@yahoo.com	Managed tertiary emulation	f	2025-07-19 06:29:22.399	2025-07-19 06:29:22.397
50706bb2-63cd-47a1-a03f-f50c65abf149	Glover, Gutkowski and Gleichner	8047 Hagenes Meadows	Ollie Dickinson Sr.	693-541-8238 x838	Ashlynn.Zulauf15@hotmail.com	Advanced composite implementation	f	2025-07-19 06:29:22.402	2025-07-19 06:29:22.4
7e2415f4-ac92-4f1b-8600-163a064d1810	Heller - Lehner	57028 Kling Glen	Stephen Heidenreich	(516) 424-3140 x262	Earnest3@hotmail.com	Fully-configurable fault-tolerant strategy	f	2025-07-19 06:29:22.404	2025-07-19 06:29:22.402
5ae55c97-6f0e-4591-923d-dbc694471eec	Klocko - Nicolas	937 Stanton Shore	Doug Hauck	1-523-723-4359 x886	Rogers75@hotmail.com	Grass-roots exuding website	f	2025-07-19 06:29:22.407	2025-07-19 06:29:22.404
0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	Lang, Rogahn and Bruen	977 Fernando Fork	Santiago Altenwerth	1-829-412-6736 x24709	Irving_Hilll@yahoo.com	Operative zero defect customer loyalty	f	2025-07-19 06:29:22.41	2025-07-19 06:29:22.408
539936de-be77-4c84-94ca-7d47fbb3eb56	Greenholt - Von	853 Champlin Inlet	Angelina Gibson	1-832-829-7032	Elfrieda44@gmail.com	Smart actuating function	f	2025-07-19 06:29:22.412	2025-07-19 06:29:22.41
37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	Zulauf, Krajcik and Boyer	21546 Carlie Mills	Chad Kihn DVM	780.233.0573	Roberta_Wyman59@yahoo.com	Versatile sustainable array	f	2025-07-19 06:29:22.415	2025-07-19 06:29:22.412
db6c0c3a-15b0-4017-a924-af68a549410c	Adams Inc	272 Collins Union	Johnathan Bogan	947.659.6578 x3586	Nona.Padberg@gmail.com	Centralized incremental application	f	2025-07-19 06:29:22.418	2025-07-19 06:29:22.415
3e74763c-982a-41eb-aec5-fa985eda5aa7	Treutel, Kertzmann and Swift	57748 Bay Street	Viola Simonis	829.493.3180 x5720	Antonetta69@gmail.com	Triple-buffered homogeneous standardization	f	2025-07-19 06:29:22.42	2025-07-19 06:29:22.418
c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	Ferry Group	6174 Hagenes Vista	Darryl Osinski-Howell IV	1-692-688-8990 x3372	Anabelle.Bergnaum@hotmail.com	Open-architected tertiary matrix	f	2025-07-19 06:29:22.422	2025-07-19 06:29:22.42
27b8f481-d8eb-45e0-b467-584b0f762e7f	Okuneva, Haley and Wisoky	902 Edmund Curve	Daniel Stark	1-421-546-2467	Jonatan36@gmail.com	Seamless homogeneous archive	f	2025-07-19 06:29:22.43	2025-07-19 06:29:22.428
7330454d-f4ec-4ba3-af48-240ceaf36685	Gleichner, Hettinger and Nolan	4030 London Centers	Mr. Nicholas Graham	528-736-6756 x37991	April_Goyette12@yahoo.com	Customizable maximized benchmark	f	2025-07-19 06:29:22.435	2025-07-19 06:29:22.432
9e94b5ba-2463-4e03-8df1-d5a743c7f287	Heller, Runolfsdottir and DuBuque	8830 Newton Road	Leon Hermann	1-874-916-7132 x3030	Francesco_Jast@gmail.com	Profound client-server conglomeration	f	2025-07-19 06:29:22.437	2025-07-19 06:29:22.435
53be4ff2-3c64-4521-b389-ce12f8973cdf	MacGyver, Prosacco and Vandervort	21611 Providenci Avenue	Brenda Stracke-Grimes	714.996.9587	May.Will74@gmail.com	Universal asynchronous hierarchy	f	2025-07-19 06:29:22.44	2025-07-19 06:29:22.438
fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	Borer Group	512 Mariane Lane	Mandy Glover	458-870-2648	Ottilie_Predovic91@hotmail.com	Networked asynchronous orchestration	f	2025-07-19 06:29:22.443	2025-07-19 06:29:22.441
2d330616-3878-417b-892d-6abdc9ad9f9f	Nitzsche LLC	20902 Perry Causeway	Martha Rohan	1-282-641-1566 x005	Gaston.Parisian19@hotmail.com	Integrated 24/7 generative AI	f	2025-07-19 06:29:22.446	2025-07-19 06:29:22.444
1d3fdb52-0a74-4c0e-97da-3680fd20df9c	Kunze, Muller and Harber	620 Royal Ridges	Miss Jackie Sauer-Feest	1-376-793-2195 x7276	Franco.Kiehn98@hotmail.com	Intuitive interactive algorithm	f	2025-07-19 06:29:22.448	2025-07-19 06:29:22.446
2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	Murazik - Okuneva	4271 Nelson Street	Myron Armstrong	997-675-5440 x109	Demarcus.Grady20@hotmail.com	Optional intangible open architecture	f	2025-07-19 06:29:22.451	2025-07-19 06:29:22.449
\.


--
-- Data for Name: CustomerHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CustomerHistory" (id, "customerId", action, details, performance, "createdAt") FROM stdin;
\.


--
-- Data for Name: GasCalibrationEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GasCalibrationEntry" (id, "certificateId", "gasType", "gasConcentration", "gasBalance", "gasBatchNumber", "createdAt", "updatedAt") FROM stdin;
2e6e8002-b661-4c6c-a9f9-ec5bfdf4f76e	0a0890b0-ecab-4ef1-9281-9159c77b9882	12	12	12	12	2025-07-19 13:36:06.637	2025-07-19 13:36:06.637
e41a40ca-8e90-43c3-8ea7-b298bee9857b	a901482c-0738-4972-a009-9e61c142ccc9	123	123	123	123	2025-07-19 13:56:33.488	2025-07-19 13:56:33.488
f5b76653-424e-49ef-851a-00443c72a26e	2f718e8a-2d3e-43ec-8e7e-e2af3f7b73c0	ko2	ok2	ok	ok	2025-07-23 12:53:13.167	2025-07-23 12:53:13.167
\.


--
-- Data for Name: InventoryCheck; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryCheck" (id, name, "scheduledDate", "completedDate", notes, "userId", "createdAt", "updatedAt", "isRecurring", "recurrenceType", "nextDate") FROM stdin;
f52b20b9-59b4-40a3-bac0-f2bf74244903	ss	2025-07-22 00:00:00	\N	ss	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 08:13:48.122	2025-07-22 08:13:48.122	f	\N	\N
04328cb2-8bb7-4c10-ab4a-6e28ab388fe2	sss	2025-07-22 00:00:00	\N	ssssss	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 08:46:36.784	2025-07-22 08:46:36.784	f	\N	\N
7cc104f1-8c22-4bf8-97b3-9221cbc653d7	ryrfd	2025-07-22 00:00:00	\N	dsa	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 08:57:14.035	2025-07-22 08:57:14.035	f	\N	\N
a73dd12a-a4f9-401c-a02c-db0a65450ecb	lp	2025-07-22 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 09:01:15.528	2025-07-22 09:01:15.528	f	\N	\N
e5748ab1-06d3-406b-bbfa-ea28e72d6f57	sss	2025-07-31 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 09:02:30.614	2025-07-22 09:02:30.614	f	\N	\N
00406b7f-72f8-4738-b720-1a67d79fdaec	kolo	2025-07-22 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 09:39:20.311	2025-07-22 09:39:20.311	f	\N	\N
cab4fa49-8208-4be1-9793-79d1b880778f	testing semoga bisa aamiin	2025-07-22 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 11:19:21.273	2025-07-22 11:19:21.273	f	\N	\N
b46b41a8-1a76-42ee-9d8d-d006eb169286	sipsss	2025-07-22 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 11:41:29.343	2025-07-22 11:41:29.343	f	\N	\N
60936ac1-4aac-4ce9-aa1f-9f3b89e12384	testing semoga amin	2025-07-22 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 12:03:53.566	2025-07-22 12:03:53.566	f	\N	\N
e868a1be-82a2-4d88-8c8d-0d7a1088e99a	halo aku rudy	2025-07-23 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:01:03.915	2025-07-22 18:01:03.915	f	\N	\N
e566db49-7c19-43e4-b1f8-3a54161d2611	baba	2025-07-23 00:00:00	\N	ss	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:09:41.37	2025-07-22 18:09:41.37	f	\N	\N
7dab9253-b56c-489e-8555-a5aa1dfdf797	Testing	2025-07-23 00:00:00	\N	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:17:34.119	2025-07-22 18:17:34.119	f	\N	\N
6de00d74-0884-45d0-9234-8dfe32bac83d	tes	2025-07-23 00:00:00	\N	es	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-23 05:44:18.2	2025-07-23 05:44:18.2	f	\N	\N
73023022-3ff8-4a1c-b109-6a01e2bc4e9a	beranak pinak	2025-07-24 00:00:00	\N	123	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 06:09:13.754	2025-07-24 06:09:13.754	f	\N	\N
\.


--
-- Data for Name: InventoryCheckExecution; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryCheckExecution" (id, name, date, status, "scheduleId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InventoryCheckExecutionItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryCheckExecutionItem" (id, "executionId", "itemSerial", verified) FROM stdin;
\.


--
-- Data for Name: InventoryCheckItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryCheckItem" (id, "checkId", "itemSerial", "verifiedStatus", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: Item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Item" ("serialNumber", name, "partNumber", sensor, description, "customerId", status, "lastVerifiedAt", "createdAt", "updatedAt") FROM stdin;
PKQJE9UNRZ	Sleek Ceramic Car	5BSXKROZ	Vibration	Discover the rural new Car with an exciting mix of Bronze ingredients	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:22.456	2025-07-19 06:29:22.456
Z2ICECQ1IC	Fresh Gold Bacon	WP5H9GKM	Temperature	Innovative Table featuring violent technology and Ceramic construction	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:22.474	2025-07-19 06:29:22.474
PW7C8OQQQW	Elegant Ceramic Sausages	BE5CMYCL	Humidity	Featuring Thorium-enhanced technology, our Bike offers unparalleled superficial performance	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:22.478	2025-07-19 06:29:22.478
FEN84RS60M	Rustic Marble Gloves	WGY0UIJQ	None	The Seamless responsive emulation Soap offers reliable performance and authentic design	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:22.481	2025-07-19 06:29:22.481
AHIJDQAK0T	Rustic Silk Hat	QEWDM0VG	Temperature	Introducing the Angola-inspired Fish, blending sociable style with local craftsmanship	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:22.484	2025-07-19 06:29:22.484
IOGS50RWDS	Refined Bronze Bike	9GY3BWJU	Humidity	The sleek and pitiful Ball comes with grey LED lighting for smart functionality	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:22.487	2025-07-19 06:29:22.487
BKZH5WOGPG	Incredible Concrete Tuna	Z9BTYKNU	Vibration	Our crispy-inspired Mouse brings a taste of luxury to your able lifestyle	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:22.491	2025-07-19 06:29:22.491
DNVC5M47JJ	Soft Bamboo Towels	E7U1W61W	Humidity	The Larue Chips is the latest in a series of purple products from Satterfield Inc	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:22.494	2025-07-19 06:29:22.494
YZQCPVVTXA	Incredible Granite Sausages	UQIT1AVE	Vibration	Professional-grade Sausages perfect for violent training and recreational use	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:22.498	2025-07-19 06:29:22.498
MFFU8NODOD	Recycled Bamboo Bacon	FMWFASOB	Vibration	Savor the savory essence in our Gloves, designed for each culinary adventures	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:22.5	2025-07-19 06:29:22.5
AFFVBN8726	Oriental Cotton Table	ZEOZVHAW	Humidity	The sleek and merry Tuna comes with gold LED lighting for smart functionality	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:22.502	2025-07-19 06:29:22.502
VCVEPTAYCQ	Unbranded Silk Gloves	3IYXHDUL	Vibration	Discover the bee-like agility of our Computer, perfect for magnificent users	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:22.505	2025-07-19 06:29:22.505
LRDNECPF0X	Electronic Silk Shirt	ZBBWVWHY	Humidity	Professional-grade Computer perfect for inconsequential training and recreational use	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:22.511	2025-07-19 06:29:22.511
6Z4WDLMUWM	Generic Silk Table	UTCYUHW5	Vibration	Our koala-friendly Chair ensures yellow comfort for your pets	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:22.517	2025-07-19 06:29:22.517
06KQ9YWG6G	Rustic Metal Towels	UNAPR3BJ	Pressure	Innovative Pants featuring repentant technology and Granite construction	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:22.521	2025-07-19 06:29:22.521
JNXVLYOCWT	Intelligent Gold Pizza	7BO8RY2Y	Vibration	The Open-source bifurcated customer loyalty Cheese offers reliable performance and ashamed design	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:22.524	2025-07-19 06:29:22.524
CG55C3UMFY	Awesome Granite Towels	Q6UZSEWC	Vibration	The olive Shirt combines United States of America aesthetics with Carbon-based durability	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:22.527	2025-07-19 06:29:22.527
RMMPQ2IEKR	Licensed Metal Chips	MBKV0D1E	Humidity	Discover the portly new Shirt with an exciting mix of Concrete ingredients	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:22.53	2025-07-19 06:29:22.53
TCIUYI9TFL	Soft Ceramic Bacon	4TMYCJET	None	The Enhanced resilient throughput Cheese offers reliable performance and trivial design	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:22.533	2025-07-19 06:29:22.533
X2BGTR33HI	Intelligent Metal Chair	L1DDX9FW	Humidity	Stylish Shirt designed to make you stand out with overcooked looks	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:22.537	2025-07-19 06:29:22.537
AAJJDJ4YK1	Recycled Silk Gloves	2FW179ML	Humidity	Discover the frightened new Bacon with an exciting mix of Bamboo ingredients	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:22.539	2025-07-19 06:29:22.539
CCSG3JHMAT	Generic Wooden Bacon	HOTMPEER	Vibration	Stylish Ball designed to make you stand out with rigid looks	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:22.546	2025-07-19 06:29:22.546
9NSDBQM85A	Refined Metal Bike	3EDXKBRR	None	New Cheese model with 83 GB RAM, 436 GB storage, and untimely features	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:22.552	2025-07-19 06:29:22.552
LQPLVEZGN9	Electronic Steel Soap	LKTMFXWP	Vibration	Recycled Computer designed with Granite for negligible performance	539b52b6-288c-420c-a5f9-f98c9ce4bbf0	AVAILABLE	\N	2025-07-19 06:29:22.556	2025-07-19 06:29:22.556
MQXBZHPG7Z	Refined Plastic Fish	4MOWOQG5	None	Our deer-friendly Chicken ensures admired comfort for your pets	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:22.559	2025-07-19 06:29:22.559
A6TSVPBAD8	Gorgeous Plastic Gloves	6ZT9OOCA	Temperature	The teal Chicken combines Kiribati aesthetics with Europium-based durability	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:22.562	2025-07-19 06:29:22.562
LMWDWH9ALE	Incredible Rubber Car	6FRVWFVL	Vibration	The grey Salad combines Ethiopia aesthetics with Thorium-based durability	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:22.565	2025-07-19 06:29:22.565
XWDM5YP5P4	Sleek Plastic Chicken	A1W3ZPPA	Pressure	Featuring Neodymium-enhanced technology, our Keyboard offers unparalleled immediate performance	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:22.567	2025-07-19 06:29:22.567
YDX0GOZAY1	Small Metal Cheese	NLNFAVNM	Temperature	Featuring Rutherfordium-enhanced technology, our Shirt offers unparalleled upright performance	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:22.57	2025-07-19 06:29:22.57
3KVEMS4SBC	Refined Concrete Soap	HKOMM8WU	Temperature	The sleek and likely Pizza comes with lime LED lighting for smart functionality	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:22.572	2025-07-19 06:29:22.572
WF8LWMRP7M	Elegant Steel Chair	I2AHC2MI	Pressure	Professional-grade Table perfect for fearless training and recreational use	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:22.575	2025-07-19 06:29:22.575
EWWVUCXKBF	Unbranded Cotton Salad	DQPWFK00	Humidity	Our giraffe-friendly Keyboard ensures honored comfort for your pets	61b4f011-ccf8-4016-b677-f3d5fbf4eb6b	AVAILABLE	\N	2025-07-19 06:29:22.579	2025-07-19 06:29:22.579
RLUAI1QLDI	Handcrafted Wooden Bike	L3W6QNFW	None	Ergonomic Ball made with Concrete for all-day granular support	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:22.581	2025-07-19 06:29:22.581
YDKFVWD8EO	Awesome Silk Bike	XYKLDDHP	Temperature	Our panda-friendly Ball ensures ethical comfort for your pets	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:22.584	2025-07-19 06:29:22.584
H8LUD2BPSY	Luxurious Gold Pizza	CLMJOSWH	Humidity	The Napoleon Car is the latest in a series of querulous products from Ortiz - Gerhold	539b52b6-288c-420c-a5f9-f98c9ce4bbf0	AVAILABLE	\N	2025-07-19 06:29:22.586	2025-07-19 06:29:22.586
9ZK8OKT0QF	Small Bronze Pants	FODM3LXO	Pressure	The Immersive tertiary portal Bacon offers reliable performance and striking design	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:22.589	2025-07-19 06:29:22.589
II9VCUNFBV	Refined Rubber Bacon	IT4GWYJQ	None	New Cheese model with 24 GB RAM, 562 GB storage, and velvety features	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:22.592	2025-07-19 06:29:22.592
BCHTZVMN0K	Sleek Ceramic Bacon	Y71NG3YT	Humidity	Savor the crispy essence in our Bacon, designed for trim culinary adventures	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:22.596	2025-07-19 06:29:22.596
XANAWYCJFL	Electronic Bronze Salad	1YIITPTT	Temperature	Discover the rabbit-like agility of our Bacon, perfect for second users	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:22.598	2025-07-19 06:29:22.598
E2ND67WK4I	Bespoke Concrete Bike	M1KJIC93	Vibration	The sleek and respectful Soap comes with plum LED lighting for smart functionality	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:22.601	2025-07-19 06:29:22.601
Y8UCHIYAVD	Incredible Granite Pants	H94QELIX	Humidity	Ergonomic Sausages made with Ceramic for all-day sentimental support	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:22.603	2025-07-19 06:29:22.603
58J2FQESQ4	Luxurious Aluminum Car	MMJEF2FR	None	Experience the yellow brilliance of our Pants, perfect for jittery environments	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:22.606	2025-07-19 06:29:22.606
SL4SWPAHKF	Oriental Aluminum Chicken	W4MLG1VI	Temperature	Savor the fluffy essence in our Computer, designed for moral culinary adventures	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.609	2025-07-19 06:29:22.609
TPPONVBHKH	Electronic Rubber Gloves	8KMFYMOB	Humidity	Our crocodile-friendly Shirt ensures dense comfort for your pets	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:22.612	2025-07-19 06:29:22.612
5RAQAJNHHF	Soft Ceramic Chicken	AWLANKBO	None	Introducing the Colombia-inspired Soap, blending suburban style with local craftsmanship	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:22.614	2025-07-19 06:29:22.614
AXSTCQXYUE	Electronic Rubber Soap	FSIRAVHH	Temperature	Featuring Osmium-enhanced technology, our Cheese offers unparalleled improbable performance	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:22.617	2025-07-19 06:29:22.617
AJGEGQH2ZM	Electronic Wooden Pants	VXZHW377	Vibration	New Computer model with 52 GB RAM, 999 GB storage, and elderly features	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:22.62	2025-07-19 06:29:22.62
EKLAPDTWJP	Refined Gold Bike	MMOROSXU	Humidity	Featuring Tantalum-enhanced technology, our Chips offers unparalleled uneven performance	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:22.622	2025-07-19 06:29:22.622
1FFZXZ0H75	Practical Bronze Tuna	OF1VPWSP	Humidity	Savor the sweet essence in our Sausages, designed for evil culinary adventures	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:22.625	2025-07-19 06:29:22.625
QITVLWV221	Recycled Concrete Chicken	SYTB58XB	Temperature	New Soap model with 76 GB RAM, 855 GB storage, and motionless features	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:22.627	2025-07-19 06:29:22.627
APAMEV23HR	Electronic Cotton Pants	J5ZHHQMO	Humidity	Stylish Table designed to make you stand out with forsaken looks	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:22.63	2025-07-19 06:29:22.63
V1QOQY4ANH	Sleek Plastic Salad	ONZQTZXS	Humidity	Discover the fatherly new Shoes with an exciting mix of Wooden ingredients	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:22.632	2025-07-19 06:29:22.632
BAR7YGM58F	Generic Aluminum Fish	Q0RSGQAV	Vibration	The grey Bike combines Democratic People's Republic of Korea aesthetics with Rhenium-based durability	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:22.634	2025-07-19 06:29:22.634
T1BPTQYB54	Fresh Bronze Bacon	XRQDFARS	Vibration	The lavender Pizza combines Curacao aesthetics with Bismuth-based durability	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:22.637	2025-07-19 06:29:22.637
H85HTNLDXE	Intelligent Plastic Mouse	NJVVGKNQ	Pressure	Our zesty-inspired Pizza brings a taste of luxury to your content lifestyle	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:22.642	2025-07-19 06:29:22.642
UYBFQ80XP4	Bespoke Silk Car	RMQNCHN3	None	Our cow-friendly Keyboard ensures hairy comfort for your pets	f7a281c3-d025-47b2-944b-8e656a89af1a	AVAILABLE	\N	2025-07-19 06:29:22.648	2025-07-19 06:29:22.648
YOK3IKKLCZ	Small Plastic Soap	1XTX0PJS	Vibration	Innovative Cheese featuring impractical technology and Gold construction	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:22.652	2025-07-19 06:29:22.652
VRRI5C2OGU	Generic Cotton Car	MKVN1PP9	Humidity	Professional-grade Cheese perfect for unlucky training and recreational use	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:22.655	2025-07-19 06:29:22.655
PU9CXXAEOL	Elegant Concrete Pizza	LH4ODOKH	Temperature	Savor the sour essence in our Fish, designed for trusty culinary adventures	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:22.659	2025-07-19 06:29:22.659
MK7BQRRKUX	Fantastic Wooden Mouse	VAOFLKRN	Pressure	Our wolf-friendly Tuna ensures difficult comfort for your pets	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:22.661	2025-07-19 06:29:22.661
TNCCBWNK6E	Licensed Wooden Mouse	YEISOSLH	Temperature	The Felton Soap is the latest in a series of tidy products from Larkin and Sons	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:22.664	2025-07-19 06:29:22.664
CW7AZHYNJ2	Practical Rubber Sausages	IQAYIYVR	Temperature	New Pants model with 24 GB RAM, 256 GB storage, and multicolored features	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:22.666	2025-07-19 06:29:22.666
7797KDFURF	Handmade Bronze Computer	GVISZX1Q	Temperature	Featuring Silver-enhanced technology, our Shoes offers unparalleled easy performance	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:22.668	2025-07-19 06:29:22.668
T3I9VORXOS	Ergonomic Aluminum Soap	FQJUUFWD	Humidity	Our hamster-friendly Table ensures lovely comfort for your pets	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:22.671	2025-07-19 06:29:22.671
FLTMLATTQW	Handmade Rubber Salad	NLACKKF2	Temperature	Discover the kangaroo-like agility of our Chips, perfect for wavy users	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:22.673	2025-07-19 06:29:22.673
OOV3VMG8NY	Unbranded Wooden Shoes	ZMSLNXY7	None	Discover the shark-like agility of our Hat, perfect for happy users	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:22.676	2025-07-19 06:29:22.676
7H28LE4B8N	Recycled Silk Chair	BUN1XV0N	Pressure	Innovative Tuna featuring finished technology and Gold construction	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:22.68	2025-07-19 06:29:22.68
VDMK7YEH0G	Handcrafted Bronze Soap	1O5V9YLJ	Humidity	Stylish Soap designed to make you stand out with blue looks	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:22.686	2025-07-19 06:29:22.686
KABMYMVE5G	Recycled Wooden Gloves	CPD7O9VG	Temperature	Professional-grade Sausages perfect for cloudy training and recreational use	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:22.69	2025-07-19 06:29:22.69
GJCYL1PURB	Licensed Aluminum Bike	YZMYJI4U	None	Innovative Bacon featuring tall technology and Metal construction	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:22.694	2025-07-19 06:29:22.694
XBSWDLW7CX	Fresh Steel Tuna	L9LCLIP4	None	Experience the mint green brilliance of our Chips, perfect for hollow environments	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:22.696	2025-07-19 06:29:22.696
TGRBRULBGF	Gorgeous Bamboo Towels	DFDVTXT9	Temperature	Discover the acidic new Soap with an exciting mix of Concrete ingredients	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:22.699	2025-07-19 06:29:22.699
CNNQB4Z8LZ	Gorgeous Aluminum Chips	VVEO1GM1	Humidity	Stylish Bike designed to make you stand out with cloudy looks	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:22.702	2025-07-19 06:29:22.702
BO7AZPHHX0	Rustic Granite Bacon	GWVIFETO	Humidity	Ergonomic Chair made with Gold for all-day homely support	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:22.704	2025-07-19 06:29:22.704
LH9SVE3MEG	Incredible Ceramic Towels	1LVPQBOS	Temperature	Professional-grade Chips perfect for svelte training and recreational use	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:22.706	2025-07-19 06:29:22.706
H8RYAIKV3S	Fresh Metal Towels	CZSKFHUJ	Temperature	Experience the lime brilliance of our Fish, perfect for prime environments	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:22.713	2025-07-19 06:29:22.713
AA73GCRU8K	Fantastic Silk Pizza	LU34ZNFY	Humidity	Savor the moist essence in our Chips, designed for utter culinary adventures	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:22.718	2025-07-19 06:29:22.718
MM9RRRVUZK	Gorgeous Ceramic Hat	UF4GLHFD	Pressure	Introducing the Iraq-inspired Shirt, blending sturdy style with local craftsmanship	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:22.721	2025-07-19 06:29:22.721
XYSWUFHH4H	Sleek Steel Chicken	HSPUUSRY	Vibration	Discover the dog-like agility of our Pizza, perfect for handsome users	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:22.725	2025-07-19 06:29:22.725
6CHFOPTIBT	Ergonomic Silk Keyboard	5UUFN3YY	Vibration	Stylish Table designed to make you stand out with charming looks	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:22.728	2025-07-19 06:29:22.728
VMFYBNNA9Y	Recycled Marble Chicken	7MMUGIXS	Vibration	Ergonomic Hat made with Aluminum for all-day querulous support	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:22.73	2025-07-19 06:29:22.73
BVTYMJBX7Q	Bespoke Rubber Car	NT6KSEP9	Vibration	Our rabbit-friendly Chips ensures black-and-white comfort for your pets	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:22.733	2025-07-19 06:29:22.733
EDMOZXRQB5	Ergonomic Rubber Pants	QOSO1YH3	Humidity	New cyan Pizza with ergonomic design for scornful comfort	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:22.735	2025-07-19 06:29:22.735
JVLVOB5LM7	Refined Steel Shoes	MBGUBNR0	Pressure	Stylish Fish designed to make you stand out with first looks	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:22.737	2025-07-19 06:29:22.737
EHR8GGCW1Y	Small Ceramic Salad	UWWUKYBM	Vibration	Hilll - Rogahn's most advanced Chips technology increases serene capabilities	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:22.74	2025-07-19 06:29:22.74
24AEM5BVB3	Small Concrete Bacon	FRWHPHGQ	None	Sawayn - Sporer's most advanced Salad technology increases far capabilities	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:22.743	2025-07-19 06:29:22.743
TCQQZSQCR6	Frozen Rubber Table	SZGKOBQO	Vibration	Savor the sweet essence in our Cheese, designed for fantastic culinary adventures	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:22.745	2025-07-19 06:29:22.745
MK2QVKKKGL	Luxurious Ceramic Mouse	LGTGYIOO	Temperature	Hane Inc's most advanced Bike technology increases dearest capabilities	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:22.747	2025-07-19 06:29:22.747
JTHLI3K4YD	Frozen Bamboo Chicken	X8ZYP6Q1	None	Licensed Sausages designed with Granite for tinted performance	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:22.75	2025-07-19 06:29:22.75
YNOZLXW0E3	Electronic Rubber Shirt	BLDW17ZX	Pressure	Experience the white brilliance of our Gloves, perfect for ethical environments	8ad57719-e332-4791-b279-945394515b36	AVAILABLE	\N	2025-07-19 06:29:22.752	2025-07-19 06:29:22.752
K2CD0ESZ0K	Handmade Bronze Soap	VLICXVZD	Temperature	The sleek and vivid Salad comes with white LED lighting for smart functionality	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:22.755	2025-07-19 06:29:22.755
YO1XPLKICP	Elegant Concrete Towels	XYYM9VHD	None	Savor the bitter essence in our Pizza, designed for odd culinary adventures	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:22.757	2025-07-19 06:29:22.757
AMRW5G0A4B	Handmade Rubber Soap	XSAQLXCO	Vibration	Introducing the Martinique-inspired Hat, blending finished style with local craftsmanship	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:22.76	2025-07-19 06:29:22.76
UDCJTOQPGF	Rustic Aluminum Salad	6PQM0BFY	None	Experience the ivory brilliance of our Pizza, perfect for babyish environments	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:22.762	2025-07-19 06:29:22.762
9GHOGTK0GO	Tasty Silk Bacon	Y0MTQCL4	Temperature	Stylish Shirt designed to make you stand out with realistic looks	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:22.77	2025-07-19 06:29:22.77
ZUTLLPQX8B	Modern Rubber Car	PNO4JYFR	Temperature	Featuring Cobalt-enhanced technology, our Shoes offers unparalleled strong performance	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:22.774	2025-07-19 06:29:22.774
VN3DZM3M1G	Generic Steel Table	CRXE6KKR	None	New Salad model with 73 GB RAM, 42 GB storage, and impeccable features	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:22.777	2025-07-19 06:29:22.777
IOSBWXMZG7	Fantastic Aluminum Mouse	P4RLG2MN	Humidity	Stylish Table designed to make you stand out with nippy looks	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.78	2025-07-19 06:29:22.78
OAW3QWZEEC	Bespoke Cotton Chair	GWZ9XFJI	Vibration	Introducing the Kuwait-inspired Keyboard, blending rare style with local craftsmanship	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:22.783	2025-07-19 06:29:22.783
AVIGKCT75Z	Sleek Bamboo Chips	XMXHPCPY	Temperature	Our savory-inspired Bike brings a taste of luxury to your warlike lifestyle	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:22.785	2025-07-19 06:29:22.785
QIAUJCSCFS	Rustic Bamboo Tuna	DKJJJBPA	Humidity	The sleek and wordy Shirt comes with fuchsia LED lighting for smart functionality	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:22.788	2025-07-19 06:29:22.788
ECGMMCED7X	Electronic Rubber Pants	9RGIHNBJ	Vibration	New tan Bacon with ergonomic design for cuddly comfort	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:22.79	2025-07-19 06:29:22.79
MKDIK2OTF7	Handmade Bronze Hat	64YHBE0B	Temperature	Ergonomic Pants made with Bamboo for all-day deep support	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:22.794	2025-07-19 06:29:22.794
Q5HJRHPNE3	Oriental Metal Gloves	DXDKEVTS	Temperature	Stylish Bike designed to make you stand out with gray looks	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:22.796	2025-07-19 06:29:22.796
RC418ASKR8	Practical Gold Soap	ANT9QDFX	Pressure	Experience the orange brilliance of our Chair, perfect for raw environments	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:22.798	2025-07-19 06:29:22.798
THLFS1EJUO	Handcrafted Ceramic Pizza	ZGWI2NJL	Pressure	Stylish Ball designed to make you stand out with superb looks	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:22.801	2025-07-19 06:29:22.801
WCKGJUKJTZ	Licensed Granite Hat	0LSZNG7Q	Humidity	Discover the bee-like agility of our Shirt, perfect for joyful users	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:22.804	2025-07-19 06:29:22.804
E1JVCSO9J3	Rustic Granite Shirt	7L5B3SKO	None	The sleek and primary Hat comes with indigo LED lighting for smart functionality	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:22.806	2025-07-19 06:29:22.806
043KNRBZPJ	Intelligent Silk Chicken	JF61TEGB	None	New Tuna model with 34 GB RAM, 501 GB storage, and basic features	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:22.813	2025-07-19 06:29:22.813
MXMWAXPJ45	Small Bronze Keyboard	MUL1ZHDH	None	The Bethel Mouse is the latest in a series of utilized products from Pfeffer and Sons	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:22.818	2025-07-19 06:29:22.818
XRKNDWOP9C	Awesome Silk Bacon	KVBQIN1L	Humidity	Hyatt Group's most advanced Pizza technology increases next capabilities	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:22.821	2025-07-19 06:29:22.821
ZYTFIKPJSI	Generic Bamboo Gloves	LRXYK1RR	Temperature	New indigo Mouse with ergonomic design for quintessential comfort	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:22.824	2025-07-19 06:29:22.824
YXJWHB96TD	Practical Bamboo Chicken	LAF41QGI	None	Ergonomic Pizza made with Aluminum for all-day meager support	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:22.827	2025-07-19 06:29:22.827
RSOCYKDGLK	Elegant Gold Ball	Y9JSIMTN	Temperature	New Bike model with 15 GB RAM, 157 GB storage, and gaseous features	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:22.83	2025-07-19 06:29:22.83
KDJTUB80PF	Intelligent Marble Salad	EXO4XNGA	None	Our squirrel-friendly Bacon ensures grubby comfort for your pets	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:22.832	2025-07-19 06:29:22.832
4P9BBZFRSQ	Electronic Rubber Sausages	FCHARJ86	None	Stylish Hat designed to make you stand out with hard-to-find looks	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:22.835	2025-07-19 06:29:22.835
HRMPIPOSQA	Frozen Bamboo Shoes	ELFSOC6E	Vibration	Experience the maroon brilliance of our Mouse, perfect for staid environments	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:22.837	2025-07-19 06:29:22.837
CC3KRHCXZF	Handcrafted Bronze Gloves	OYY8HP4V	Temperature	Gorgeous Bike designed with Concrete for stable performance	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.844	2025-07-19 06:29:22.844
2AAN0TA8PT	Electronic Steel Tuna	U0LF9AQS	Humidity	Our turtle-friendly Chicken ensures gracious comfort for your pets	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:22.849	2025-07-19 06:29:22.849
OE07HNVHCF	Intelligent Aluminum Mouse	AOKJ8LJG	Vibration	Discover the lost new Salad with an exciting mix of Cotton ingredients	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:22.853	2025-07-19 06:29:22.853
FOV62BJ13X	Frozen Gold Pants	7DFRJMJH	Temperature	The Open-architected full-range moderator Sausages offers reliable performance and innocent design	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:22.855	2025-07-19 06:29:22.855
1AWXCTCEAL	Small Wooden Computer	XCGCXPFU	None	Featuring Technetium-enhanced technology, our Chair offers unparalleled swift performance	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:22.859	2025-07-19 06:29:22.859
D9UK6NPANY	Rustic Plastic Computer	ZYMSWRYU	Vibration	New Ball model with 3 GB RAM, 314 GB storage, and superior features	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:22.861	2025-07-19 06:29:22.861
ZZ0URL9HH7	Gorgeous Rubber Chicken	WWNY3X8H	Humidity	Discover the rigid new Ball with an exciting mix of Bronze ingredients	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:22.866	2025-07-19 06:29:22.866
TANQNQGAOT	Sleek Bamboo Hat	C8PFRFOW	Vibration	Discover the bee-like agility of our Bacon, perfect for beneficial users	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:22.872	2025-07-19 06:29:22.872
WYPRR9SPDX	Handmade Gold Table	BQGUUHER	Temperature	Our tangy-inspired Shoes brings a taste of luxury to your deficient lifestyle	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.876	2025-07-19 06:29:22.876
HWRP01HOON	Tasty Bamboo Soap	NTD1SR4F	Temperature	Licensed Gloves designed with Rubber for glittering performance	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:22.879	2025-07-19 06:29:22.879
IUFSZDYHN6	Ergonomic Silk Soap	RNN0ALTP	Humidity	The Reactive 24/7 database Bacon offers reliable performance and unused design	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:22.882	2025-07-19 06:29:22.882
5CRZPZV2AE	Unbranded Granite Mouse	WMYP6AY6	Temperature	The Sigrid Bike is the latest in a series of wiggly products from Watsica - Klein	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:22.884	2025-07-19 06:29:22.884
ZGMZ8IAKAV	Oriental Metal Gloves	MOKVDAKB	Humidity	Discover the basic new Chair with an exciting mix of Cotton ingredients	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:22.887	2025-07-19 06:29:22.887
OMWAUHMRIW	Small Rubber Ball	V75NNQO7	Vibration	Discover the fox-like agility of our Shirt, perfect for grumpy users	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:22.889	2025-07-19 06:29:22.889
C1B3ZHPEAN	Electronic Bamboo Keyboard	Q49BRZQQ	None	The sleek and rubbery Fish comes with tan LED lighting for smart functionality	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:22.892	2025-07-19 06:29:22.892
KTR5N0LQWF	Bespoke Plastic Towels	ZBX9I4C4	Vibration	Professional-grade Gloves perfect for overcooked training and recreational use	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:22.895	2025-07-19 06:29:22.895
SMYEB55NGQ	Oriental Plastic Chips	PKU3FJRY	Temperature	Unbranded Bike designed with Rubber for blue performance	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:22.897	2025-07-19 06:29:22.897
FQ2OLAI8SF	Rustic Bamboo Table	VVIA2ZEA	None	Innovative Mouse featuring miserly technology and Steel construction	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:22.9	2025-07-19 06:29:22.9
MZBB2MSU0I	Recycled Silk Car	LIJONPVG	Vibration	Experience the plum brilliance of our Hat, perfect for ideal environments	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:22.903	2025-07-19 06:29:22.903
WGION8OW0O	Fantastic Bronze Bacon	VOCBK6KC	Pressure	Discover the ostrich-like agility of our Mouse, perfect for nocturnal users	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:22.905	2025-07-19 06:29:22.905
CA9F6CMQD8	Oriental Marble Fish	LFNCJUNC	Temperature	The Sustainable uniform process improvement Chips offers reliable performance and lean design	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:22.909	2025-07-19 06:29:22.909
EAZTDXCC29	Electronic Wooden Hat	ZNQP5Q3G	Temperature	Discover the giraffe-like agility of our Chicken, perfect for jittery users	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:22.912	2025-07-19 06:29:22.912
RTNO7XTTSR	Luxurious Rubber Cheese	4FKMNL45	None	Stylish Pants designed to make you stand out with caring looks	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:22.915	2025-07-19 06:29:22.915
Q6PA7GTN6W	Luxurious Metal Car	KPFISZQD	Vibration	Experience the salmon brilliance of our Sausages, perfect for shameful environments	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.917	2025-07-19 06:29:22.917
2ODRAJQD7S	Generic Bronze Table	UYKOAFAC	None	Experience the orange brilliance of our Pizza, perfect for cultivated environments	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:22.92	2025-07-19 06:29:22.92
DVG8J5MKOR	Fresh Concrete Chair	GLIFQLJG	Vibration	Mayer, Mayer and Hills's most advanced Ball technology increases fearless capabilities	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:22.922	2025-07-19 06:29:22.922
PGZMVKHHL7	Incredible Concrete Soap	HUMBJY7O	Vibration	The sleek and outstanding Ball comes with azure LED lighting for smart functionality	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:22.925	2025-07-19 06:29:22.925
VHVGON24EN	Modern Ceramic Mouse	BLCO0F6G	None	The sleek and accurate Pizza comes with mint green LED lighting for smart functionality	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:22.928	2025-07-19 06:29:22.928
P2V0YDRI4T	Elegant Ceramic Car	YEYELXSM	Vibration	Licensed Ball designed with Steel for crooked performance	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:22.93	2025-07-19 06:29:22.93
Y0ZRSOPO50	Handcrafted Bamboo Tuna	FLQJKN6X	None	New Computer model with 34 GB RAM, 435 GB storage, and ugly features	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:22.933	2025-07-19 06:29:22.933
QZMC255264	Small Gold Gloves	BZ4TQ4XU	Temperature	Professional-grade Cheese perfect for joyous training and recreational use	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:22.935	2025-07-19 06:29:22.935
NQX0QWKOWJ	Handmade Ceramic Bacon	5TO83352	Temperature	The sleek and flawless Car comes with yellow LED lighting for smart functionality	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:22.937	2025-07-19 06:29:22.937
UH5MZ5AGE8	Rustic Metal Tuna	IAVHBF8L	Vibration	Savor the fresh essence in our Shirt, designed for trim culinary adventures	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:22.943	2025-07-19 06:29:22.943
QBIUHR0YUH	Handmade Granite Mouse	OR1IHHYP	Vibration	Experience the plum brilliance of our Chips, perfect for splendid environments	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:22.948	2025-07-19 06:29:22.948
O7A1UJIAYH	Elegant Steel Fish	BWMZADIA	Temperature	The Nichole Gloves is the latest in a series of spiteful products from Ebert Group	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:22.952	2025-07-19 06:29:22.952
CJDWTZIQOA	Fantastic Aluminum Fish	MPRONH8Y	Vibration	Professional-grade Cheese perfect for classic training and recreational use	ece6754c-4cf1-4838-9f1a-5f79babb12f5	AVAILABLE	\N	2025-07-19 06:29:22.956	2025-07-19 06:29:22.956
5HFAAQ0HVF	Luxurious Silk Tuna	JG5H9HJQ	Humidity	Our spicy-inspired Towels brings a taste of luxury to your petty lifestyle	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:22.959	2025-07-19 06:29:22.959
F76ECP5ECA	Practical Wooden Keyboard	3NHYFMZW	Humidity	The cyan Shirt combines Chad aesthetics with Nickel-based durability	61b4f011-ccf8-4016-b677-f3d5fbf4eb6b	AVAILABLE	\N	2025-07-19 06:29:22.961	2025-07-19 06:29:22.961
OW8FRU65ES	Licensed Rubber Mouse	B7GUTHBU	Humidity	Rolfson, Nikolaus and Spinka's most advanced Tuna technology increases edible capabilities	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:22.964	2025-07-19 06:29:22.964
H4IK7XX3ME	Refined Granite Bacon	YQKRMHPM	None	Discover the quiet new Pizza with an exciting mix of Rubber ingredients	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:22.966	2025-07-19 06:29:22.966
S3FVSHNZ86	Electronic Gold Chips	8WPXS28G	None	New Ball model with 92 GB RAM, 26 GB storage, and posh features	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:22.969	2025-07-19 06:29:22.969
FX8PYEIRTC	Unbranded Gold Soap	U0YTQ0NQ	None	The Kenyon Chair is the latest in a series of beneficial products from Zieme Group	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:22.972	2025-07-19 06:29:22.972
D8CHYQJ7RQ	Oriental Marble Fish	EBQW2XQH	Pressure	New Cheese model with 96 GB RAM, 664 GB storage, and accurate features	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:22.976	2025-07-19 06:29:22.976
UCDRXWAELJ	Luxurious Granite Pants	0HX9Q5MA	Pressure	New Keyboard model with 100 GB RAM, 330 GB storage, and proper features	539b52b6-288c-420c-a5f9-f98c9ce4bbf0	AVAILABLE	\N	2025-07-19 06:29:22.979	2025-07-19 06:29:22.979
X33TDXXIVQ	Sleek Bamboo Mouse	EQZXPMAQ	Temperature	Handmade Salad designed with Steel for thorny performance	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:22.982	2025-07-19 06:29:22.982
NJVQPUG62T	Fresh Rubber Keyboard	5RO5V31G	Humidity	Professional-grade Mouse perfect for narrow training and recreational use	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:22.984	2025-07-19 06:29:22.984
CASMVFVN7F	Gorgeous Bamboo Computer	VZOLTYP7	Pressure	New Pizza model with 65 GB RAM, 615 GB storage, and heavy features	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:22.987	2025-07-19 06:29:22.987
WUKTACQPWS	Oriental Marble Chair	OKHAN8VE	Temperature	Our sour-inspired Chips brings a taste of luxury to your negligible lifestyle	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:22.99	2025-07-19 06:29:22.99
BYGQVGVEOF	Modern Metal Ball	FT22WTOE	Pressure	Professional-grade Computer perfect for tough training and recreational use	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:22.993	2025-07-19 06:29:22.993
HUNCNIEEMA	Soft Ceramic Sausages	ARUEGVAK	Pressure	The Burdette Computer is the latest in a series of trivial products from Kertzmann Inc	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:22.995	2025-07-19 06:29:22.995
F6LZEHFPDK	Soft Plastic Bacon	IR39VP4N	None	Innovative Bacon featuring zesty technology and Gold construction	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:22.998	2025-07-19 06:29:22.998
NWY2LLDDLR	Fresh Plastic Cheese	JXV7YGI8	Vibration	The sleek and proper Sausages comes with olive LED lighting for smart functionality	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:23.001	2025-07-19 06:29:23.001
MRMOMTZQ97	Bespoke Metal Pants	XIHN774M	Vibration	Introducing the Holy See (Vatican City State)-inspired Bike, blending ill-fated style with local craftsmanship	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:23.003	2025-07-19 06:29:23.003
PENVJHLIUM	Sleek Concrete Chips	NQF4GTHQ	Vibration	Innovative Table featuring powerful technology and Concrete construction	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:23.006	2025-07-19 06:29:23.006
SB5QQGHCED	Recycled Metal Bacon	AC2SMYPN	None	Discover the deer-like agility of our Ball, perfect for definite users	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:23.009	2025-07-19 06:29:23.009
OP3Z6O4R8A	Gorgeous Silk Pizza	1FPCHRXD	None	Ergonomic Hat made with Plastic for all-day scornful support	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:23.014	2025-07-19 06:29:23.014
BBHLYGDSFQ	Unbranded Bronze Tuna	9SOCG9SC	Humidity	Our creamy-inspired Tuna brings a taste of luxury to your athletic lifestyle	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:23.017	2025-07-19 06:29:23.017
CGYZ9YGGMN	Small Aluminum Fish	0M9JCDUY	Vibration	Innovative Chips featuring putrid technology and Concrete construction	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:23.02	2025-07-19 06:29:23.02
WBKHAK4KRJ	Fresh Wooden Ball	AP6LMXUJ	Pressure	The Ergonomic secondary definition Bike offers reliable performance and rotating design	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:23.022	2025-07-19 06:29:23.022
SYSXC3YWLZ	Handmade Granite Shirt	TAVCYG4R	Pressure	Ergonomic Hat made with Bamboo for all-day dual support	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:23.025	2025-07-19 06:29:23.025
UU49AYLD0H	Ergonomic Granite Mouse	HIYAABKS	Pressure	Introducing the Romania-inspired Bacon, blending ironclad style with local craftsmanship	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:23.027	2025-07-19 06:29:23.027
MVIWZ6CSL4	Incredible Concrete Ball	J5IM83T6	None	Handmade Gloves designed with Metal for exotic performance	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:23.03	2025-07-19 06:29:23.03
N0HFKY28VQ	Unbranded Plastic Towels	51IO3SZJ	Vibration	The Phased client-server frame Cheese offers reliable performance and heavenly design	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:23.032	2025-07-19 06:29:23.032
JDALM9T3M3	Elegant Silk Keyboard	E28MNMXU	Pressure	The mint green Sausages combines Montserrat aesthetics with Fermium-based durability	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:23.034	2025-07-19 06:29:23.034
RZXCURTJ9A	Fantastic Gold Soap	EKA3KMVJ	Vibration	The blue Bike combines Haiti aesthetics with Boron-based durability	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:23.037	2025-07-19 06:29:23.037
5TJYCOKGJA	Practical Silk Pants	ELDGKIZQ	None	Savor the sweet essence in our Pants, designed for haunting culinary adventures	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:23.039	2025-07-19 06:29:23.039
PQKVONOH3H	Intelligent Rubber Cheese	PQW7SNAO	None	New Pants model with 42 GB RAM, 286 GB storage, and vast features	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:23.042	2025-07-19 06:29:23.042
TNUSNPJVYW	Incredible Silk Fish	GJPLOD9F	None	Innovative Pizza featuring frugal technology and Granite construction	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:23.045	2025-07-19 06:29:23.045
L0GR2MF6LY	Frozen Gold Shoes	OBVRKZQR	None	Savor the tender essence in our Table, designed for menacing culinary adventures	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.047	2025-07-19 06:29:23.047
AMXBFAQPKR	Small Rubber Hat	PLQQS0LB	None	New Tuna model with 65 GB RAM, 391 GB storage, and separate features	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:23.05	2025-07-19 06:29:23.05
YJCGBULXDY	Frozen Steel Shoes	TRHRMT4U	Temperature	New Tuna model with 37 GB RAM, 823 GB storage, and different features	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:23.053	2025-07-19 06:29:23.053
H29B7V63ZC	Frozen Metal Salad	OYSAQHZN	Vibration	Fresh Mouse designed with Metal for outgoing performance	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:23.055	2025-07-19 06:29:23.055
FOQZGAAGHM	Awesome Silk Fish	HUAAS8VD	None	Ergonomic Computer made with Marble for all-day definite support	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.058	2025-07-19 06:29:23.058
RB5XYYEOH4	Rustic Concrete Car	VA9GLXCQ	None	Discover the decisive new Gloves with an exciting mix of Bronze ingredients	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:23.06	2025-07-19 06:29:23.06
HCY1ZWGYSV	Ergonomic Aluminum Computer	QX3TSPYM	None	Our sea lion-friendly Cheese ensures imaginary comfort for your pets	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:23.063	2025-07-19 06:29:23.063
GNLTYKETMC	Tasty Granite Salad	F6KJCETU	Vibration	Experience the plum brilliance of our Chips, perfect for writhing environments	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:23.065	2025-07-19 06:29:23.065
4LEUSVGAMR	Soft Ceramic Chicken	5SJY9CXN	Pressure	Featuring Gadolinium-enhanced technology, our Shoes offers unparalleled squiggly performance	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:23.068	2025-07-19 06:29:23.068
SDAVEHZHG9	Refined Wooden Sausages	WCIMSK39	None	Innovative Pants featuring lost technology and Ceramic construction	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:23.071	2025-07-19 06:29:23.071
PAPSI6PK7O	Refined Rubber Computer	MIQXAP6E	Temperature	Yost, Miller and Kirlin's most advanced Bike technology increases lovable capabilities	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:23.073	2025-07-19 06:29:23.073
D81XYDOO1Z	Handcrafted Bronze Gloves	D7SCGJG8	Humidity	Our juicy-inspired Gloves brings a taste of luxury to your our lifestyle	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:23.08	2025-07-19 06:29:23.08
E9RIE5IPBK	Modern Marble Sausages	DYEDK0GG	Temperature	The sleek and emotional Computer comes with blue LED lighting for smart functionality	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:23.085	2025-07-19 06:29:23.085
8NR9HPID9Y	Bespoke Wooden Soap	B6OFB5W1	Temperature	Introducing the Kuwait-inspired Chips, blending shoddy style with local craftsmanship	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.089	2025-07-19 06:29:23.089
H7HS5E9BSD	Unbranded Wooden Salad	EHNODJHV	None	Our juicy-inspired Chicken brings a taste of luxury to your urban lifestyle	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:23.092	2025-07-19 06:29:23.092
PNXYMWCNZK	Awesome Plastic Keyboard	9AL6UT1C	Pressure	Discover the eagle-like agility of our Cheese, perfect for turbulent users	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:23.095	2025-07-19 06:29:23.095
GVYLCBN13J	Elegant Concrete Car	RZCCMZUE	Pressure	Ergonomic Chicken made with Granite for all-day long-term support	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:23.098	2025-07-19 06:29:23.098
FSX0WKW24C	Recycled Concrete Car	LIUUBASL	Vibration	Our savory-inspired Table brings a taste of luxury to your granular lifestyle	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.101	2025-07-19 06:29:23.101
JYMSOKEFWU	Generic Steel Sausages	HFBVATZU	Pressure	Discover the curly new Tuna with an exciting mix of Bronze ingredients	8ad57719-e332-4791-b279-945394515b36	AVAILABLE	\N	2025-07-19 06:29:23.103	2025-07-19 06:29:23.103
UN6LQ7MF2C	Recycled Marble Ball	62QJ6XWV	Vibration	Innovative Shoes featuring expert technology and Metal construction	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:23.106	2025-07-19 06:29:23.106
SGNWQATVOD	Frozen Aluminum Table	CN53CDXR	Temperature	Discover the fussy new Fish with an exciting mix of Marble ingredients	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:23.109	2025-07-19 06:29:23.109
CNYBAX0ARR	Soft Granite Keyboard	6EK7QWZY	Vibration	New yellow Computer with ergonomic design for shoddy comfort	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:23.111	2025-07-19 06:29:23.111
3FRSQIFQAM	Small Steel Shoes	8XUJHWRV	Humidity	The Programmable real-time installation Fish offers reliable performance and mean design	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:23.119	2025-07-19 06:29:23.119
IWZU1KMZFY	Gorgeous Marble Chicken	QDS5YPJ6	None	Experience the pink brilliance of our Pizza, perfect for everlasting environments	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:23.126	2025-07-19 06:29:23.126
BRLCEBPYYY	Soft Ceramic Hat	S8SM9VRA	Pressure	Discover the circular new Car with an exciting mix of Bronze ingredients	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:23.13	2025-07-19 06:29:23.13
UKYXF0NHG2	Incredible Granite Gloves	2BHEZCJ7	Vibration	Unbranded Shirt designed with Wooden for outlying performance	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.133	2025-07-19 06:29:23.133
EKPLU03LIW	Small Aluminum Pizza	PNZZB7P6	None	Savor the zesty essence in our Gloves, designed for serpentine culinary adventures	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:23.136	2025-07-19 06:29:23.136
G8T69UMJBF	Awesome Granite Salad	OJOOHYJX	Vibration	Savor the fluffy essence in our Cheese, designed for blue culinary adventures	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:23.138	2025-07-19 06:29:23.138
MDKGQIUY0T	Tasty Bamboo Pizza	TJSAIBVV	Humidity	Discover the rabbit-like agility of our Sausages, perfect for pink users	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:23.142	2025-07-19 06:29:23.142
FYZIV7MBCM	Electronic Wooden Salad	TYEWHHIL	None	Kutch, Smitham and Wiegand's most advanced Fish technology increases pleasant capabilities	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:23.145	2025-07-19 06:29:23.145
X5VKP6QCJB	Fresh Rubber Salad	XT5AFDSA	Vibration	Bespoke Sausages designed with Aluminum for other performance	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:23.148	2025-07-19 06:29:23.148
CY7PYRD65G	Licensed Steel Chips	NPSCCQIO	None	Modern Shirt designed with Silk for thrifty performance	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:23.15	2025-07-19 06:29:23.15
9CZFWHKVS3	Fantastic Rubber Towels	5WZNPQFS	Temperature	Professional-grade Table perfect for selfish training and recreational use	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:23.153	2025-07-19 06:29:23.153
MKNRGXM8AD	Small Metal Fish	DPDEVLGQ	Humidity	Ergonomic Pizza made with Wooden for all-day vain support	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.155	2025-07-19 06:29:23.155
FAUMCCHHQW	Modern Bamboo Fish	WPERT24E	Pressure	Introducing the United Arab Emirates-inspired Car, blending questionable style with local craftsmanship	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.164	2025-07-19 06:29:23.164
1T9IGEC0KG	Soft Steel Sausages	0QHS8NOB	Pressure	Experience the red brilliance of our Table, perfect for funny environments	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:23.169	2025-07-19 06:29:23.169
G5SRW4HWDB	Ergonomic Granite Cheese	MCBYS6NS	Pressure	The Lupe Table is the latest in a series of sparkling products from Pfeffer - Schamberger	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:23.173	2025-07-19 06:29:23.173
IJAQQQFSCY	Licensed Plastic Fish	0MWMQQEU	Temperature	Our juicy-inspired Shoes brings a taste of luxury to your another lifestyle	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.177	2025-07-19 06:29:23.177
F6B8W5X5XB	Frozen Steel Salad	RD9H8F9L	Pressure	The sleek and usable Hat comes with indigo LED lighting for smart functionality	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:23.181	2025-07-19 06:29:23.181
JS9SVS2J4H	Sleek Wooden Computer	UFMR28L5	Pressure	New Pants model with 94 GB RAM, 217 GB storage, and funny features	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.183	2025-07-19 06:29:23.183
HRL9Z5KPXG	Recycled Gold Bacon	CWMUGJIC	Vibration	Our butterfly-friendly Fish ensures trusting comfort for your pets	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:23.186	2025-07-19 06:29:23.186
DGT0PQHLOV	Licensed Granite Shirt	BDPBHBXJ	Temperature	Innovative Tuna featuring whopping technology and Concrete construction	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:23.188	2025-07-19 06:29:23.188
VAHFHNJKZC	Oriental Steel Shoes	9DSNRHUC	None	Stylish Keyboard designed to make you stand out with wicked looks	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.192	2025-07-19 06:29:23.192
YC7VPKY87H	Practical Steel Salad	I0XCRRX6	None	The turquoise Bacon combines Belize aesthetics with Titanium-based durability	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.199	2025-07-19 06:29:23.199
V4AF9GCHHR	Generic Bamboo Cheese	HZYJBQ35	None	The Dorthy Pizza is the latest in a series of red products from Kertzmann Group	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:23.203	2025-07-19 06:29:23.203
VHFEAPA4HQ	Handmade Cotton Chicken	D5E0HJDQ	Humidity	Discover the fish-like agility of our Pizza, perfect for similar users	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:23.207	2025-07-19 06:29:23.207
GQPYB5ANSZ	Fantastic Metal Hat	JSXQKPFY	Pressure	New Soap model with 51 GB RAM, 230 GB storage, and unwilling features	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:23.21	2025-07-19 06:29:23.21
5JFZ4QGJ12	Bespoke Marble Mouse	Y44Z1GCU	Pressure	Innovative Chicken featuring classic technology and Concrete construction	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:23.213	2025-07-19 06:29:23.213
KBP0IIIHEL	Small Gold Gloves	0RI9CCGR	Temperature	The yellow Bacon combines Tajikistan aesthetics with Promethium-based durability	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:23.215	2025-07-19 06:29:23.215
3FY8KGJR3Y	Intelligent Bronze Bacon	MUGVKX5T	Vibration	The sleek and stale Computer comes with plum LED lighting for smart functionality	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.218	2025-07-19 06:29:23.218
ZNYARFU1OS	Generic Metal Hat	NVVOMURI	Humidity	Tasty Fish designed with Bronze for untrue performance	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.221	2025-07-19 06:29:23.221
G3ZH4H7DIQ	Generic Wooden Cheese	XS9LIAN2	Pressure	The sleek and gentle Fish comes with tan LED lighting for smart functionality	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:23.223	2025-07-19 06:29:23.223
KZINWSJ5IO	Incredible Rubber Salad	YZ4FANSP	Humidity	The sleek and private Bike comes with azure LED lighting for smart functionality	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.226	2025-07-19 06:29:23.226
A7HRLHGP98	Soft Wooden Bike	7ZX3REEX	None	The sleek and flowery Computer comes with grey LED lighting for smart functionality	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:23.229	2025-07-19 06:29:23.229
KA1RVLM60J	Incredible Plastic Chair	SLT4DL6H	Humidity	Incredible Pizza designed with Cotton for unfit performance	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:23.232	2025-07-19 06:29:23.232
6JDUWRTO0C	Elegant Concrete Pizza	2G20L8YD	None	Stylish Salad designed to make you stand out with grumpy looks	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:23.235	2025-07-19 06:29:23.235
PBAXKDGSX8	Ergonomic Cotton Pants	LHMDDQP3	Humidity	Discover the unwieldy new Pants with an exciting mix of Silk ingredients	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:23.238	2025-07-19 06:29:23.238
WDJ3KITKHP	Frozen Steel Gloves	0EVWSSBE	Vibration	Bespoke Fish designed with Steel for deadly performance	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:23.246	2025-07-19 06:29:23.246
AM0INWHV82	Handmade Silk Salad	Z7M5JYBX	None	Professional-grade Ball perfect for turbulent training and recreational use	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:23.251	2025-07-19 06:29:23.251
MCQPGRDDGQ	Handmade Marble Towels	FLTRHP2K	Humidity	Introducing the Pitcairn Islands-inspired Fish, blending other style with local craftsmanship	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:23.254	2025-07-19 06:29:23.254
FXICYLPHW6	Frozen Gold Chicken	TMJHRWDE	None	Ergonomic Fish made with Marble for all-day unknown support	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:23.257	2025-07-19 06:29:23.257
DBO4MROS6L	Luxurious Plastic Gloves	LP9CEZDQ	Vibration	Featuring Selenium-enhanced technology, our Bike offers unparalleled jubilant performance	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:23.26	2025-07-19 06:29:23.26
KNH9B4FGKV	Oriental Concrete Gloves	FMUQYPKM	Humidity	Discover the lustrous new Computer with an exciting mix of Ceramic ingredients	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:23.262	2025-07-19 06:29:23.262
TUT5YEOF02	Intelligent Gold Tuna	D3MXJ60I	Temperature	The sleek and liquid Sausages comes with teal LED lighting for smart functionality	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.265	2025-07-19 06:29:23.265
UTSC9K3AIE	Sleek Plastic Bike	YIBNGGVV	Vibration	Our lion-friendly Pants ensures critical comfort for your pets	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:23.268	2025-07-19 06:29:23.268
QWAPECRT7J	Fantastic Gold Keyboard	KZJSDDOE	Pressure	The plum Chicken combines Barbados aesthetics with Thallium-based durability	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:23.27	2025-07-19 06:29:23.27
Q9F9TKK6PG	Practical Aluminum Fish	XF6XAQ23	Pressure	Introducing the Dominican Republic-inspired Mouse, blending self-reliant style with local craftsmanship	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:23.272	2025-07-19 06:29:23.272
62NXIMCWOR	Small Steel Tuna	LSXXKWEI	Pressure	New white Car with ergonomic design for pure comfort	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.275	2025-07-19 06:29:23.275
4WZV5YBBT5	Incredible Bronze Chips	VHAWXHSF	Pressure	Savor the fresh essence in our Chicken, designed for advanced culinary adventures	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:23.277	2025-07-19 06:29:23.277
6963TCA6UX	Sleek Silk Car	ZADTQIKR	Pressure	Our kangaroo-friendly Soap ensures snoopy comfort for your pets	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:23.281	2025-07-19 06:29:23.281
2ZLZ16LFEE	Oriental Granite Bacon	3IQA139R	Humidity	Our butterfly-friendly Pants ensures slow comfort for your pets	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:23.284	2025-07-19 06:29:23.284
0O4X1T6XV8	Soft Metal Shirt	VRLJD452	Vibration	The Jaquan Pizza is the latest in a series of shoddy products from Von, Schmitt and Wilkinson	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:23.287	2025-07-19 06:29:23.287
JFSXE0OO9X	Handmade Silk Shoes	JNRLIYSH	Pressure	Our squirrel-friendly Shirt ensures juicy comfort for your pets	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:23.289	2025-07-19 06:29:23.289
5GSRXLF5ND	Licensed Bronze Keyboard	YRLGIHS8	Pressure	Tremblay - Toy's most advanced Towels technology increases dutiful capabilities	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:23.293	2025-07-19 06:29:23.293
Z6VWMOHBUN	Elegant Marble Shirt	2THAZGFS	Humidity	Featuring Silicon-enhanced technology, our Shoes offers unparalleled sneaky performance	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:23.295	2025-07-19 06:29:23.295
W854LBX4BJ	Refined Plastic Soap	OEOJXVAG	None	Our bear-friendly Pizza ensures improbable comfort for your pets	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:23.299	2025-07-19 06:29:23.299
RIACGCZJIL	Oriental Metal Towels	G8KQPZD1	Humidity	Our dolphin-friendly Sausages ensures next comfort for your pets	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:23.301	2025-07-19 06:29:23.301
VXUPLBNDHX	Handmade Plastic Sausages	1RQMC2C9	Humidity	The Operative neutral framework Keyboard offers reliable performance and gorgeous design	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:23.303	2025-07-19 06:29:23.303
2WIKUIXCSA	Practical Wooden Gloves	WEJ6B2MD	Temperature	Professional-grade Bike perfect for normal training and recreational use	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:23.306	2025-07-19 06:29:23.306
EYENXAAXZ4	Soft Cotton Shirt	SUXEA2YA	Vibration	Stylish Pants designed to make you stand out with assured looks	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:23.309	2025-07-19 06:29:23.309
0NVXCRYHCL	Bespoke Marble Table	TYN70QNU	Humidity	New Bacon model with 44 GB RAM, 288 GB storage, and important features	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:23.311	2025-07-19 06:29:23.311
HRQMM1RWAH	Practical Steel Sausages	G1VIBMYF	Vibration	New Fish model with 95 GB RAM, 112 GB storage, and whopping features	539b52b6-288c-420c-a5f9-f98c9ce4bbf0	AVAILABLE	\N	2025-07-19 06:29:23.313	2025-07-19 06:29:23.313
NFUQHJYJCP	Unbranded Bronze Towels	WJYX45KM	Humidity	Discover the homely new Chips with an exciting mix of Gold ingredients	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:23.316	2025-07-19 06:29:23.316
BNINMACFKM	Handcrafted Silk Computer	QYEYDTRQ	Vibration	New red Computer with ergonomic design for spotless comfort	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:23.318	2025-07-19 06:29:23.318
7RUROA5XZY	Intelligent Metal Sausages	P9HORCYQ	Pressure	The sleek and surprised Shoes comes with fuchsia LED lighting for smart functionality	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:23.321	2025-07-19 06:29:23.321
LRMR50JEXT	Modern Rubber Soap	MQKT9JWH	Temperature	Innovative Keyboard featuring trusty technology and Ceramic construction	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:23.324	2025-07-19 06:29:23.324
YNTWII6QQL	Small Cotton Sausages	9YXY2IMK	Humidity	The sleek and intent Towels comes with silver LED lighting for smart functionality	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:23.326	2025-07-19 06:29:23.326
INA3HIYIDZ	Oriental Granite Shirt	I9KSFMVH	Vibration	Dietrich Group's most advanced Salad technology increases intent capabilities	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:23.33	2025-07-19 06:29:23.33
5IPFSCW5CI	Tasty Ceramic Bacon	KPFGFK2N	None	Introducing the Djibouti-inspired Shoes, blending blank style with local craftsmanship	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:23.332	2025-07-19 06:29:23.332
QJYYSUTEET	Oriental Bamboo Gloves	T18RQMEN	None	Professional-grade Fish perfect for neighboring training and recreational use	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:23.334	2025-07-19 06:29:23.334
OTHETU3MRH	Refined Marble Towels	NMVUILFO	Vibration	Our hippopotamus-friendly Shirt ensures earnest comfort for your pets	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.343	2025-07-19 06:29:23.343
Z6RE5HXRNH	Refined Concrete Computer	QEJUFIAW	Humidity	New Soap model with 89 GB RAM, 476 GB storage, and gloomy features	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:23.346	2025-07-19 06:29:23.346
Z3OETTNOZ6	Small Gold Ball	NQLLHIZI	None	The Balanced static instruction set Car offers reliable performance and elderly design	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:23.348	2025-07-19 06:29:23.348
G6LG6IFD7K	Luxurious Metal Cheese	WDVIGZY9	Vibration	New plum Car with ergonomic design for disloyal comfort	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.351	2025-07-19 06:29:23.351
4EFYGEKBMT	Electronic Ceramic Soap	XHFIR9SU	Vibration	The User-centric logistical moratorium Towels offers reliable performance and suburban design	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:23.358	2025-07-19 06:29:23.358
SYZGG5VRKQ	Small Aluminum Chair	A4K3HBCI	Humidity	Our sweet-inspired Ball brings a taste of luxury to your minty lifestyle	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.363	2025-07-19 06:29:23.363
U8YH9UTWTD	Luxurious Steel Bike	OKQLEPNK	Vibration	Our horse-friendly Table ensures dismal comfort for your pets	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:23.366	2025-07-19 06:29:23.366
LEZXDPHXTC	Electronic Rubber Mouse	BQMYWRZB	None	Experience the black brilliance of our Sausages, perfect for gloomy environments	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:23.369	2025-07-19 06:29:23.369
9D34UVRIQH	Refined Rubber Bike	ADQE6EBR	Pressure	Stylish Soap designed to make you stand out with inconsequential looks	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:23.372	2025-07-19 06:29:23.372
ZDCD6I9EZE	Handmade Bamboo Sausages	F9NYAOUV	Pressure	The plum Keyboard combines Guyana aesthetics with Hafnium-based durability	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:23.375	2025-07-19 06:29:23.375
WKRF4VU79T	Licensed Concrete Table	GV8U2YHV	None	Professional-grade Shoes perfect for failing training and recreational use	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:23.377	2025-07-19 06:29:23.377
YPVLNFB1UH	Fantastic Rubber Computer	XEOYQL2X	Humidity	The Open-source exuding neural-net Hat offers reliable performance and outlying design	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.38	2025-07-19 06:29:23.38
2RKKVX9ITB	Soft Concrete Pants	3QMG5JLK	Humidity	Lueilwitz LLC's most advanced Mouse technology increases worthless capabilities	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:23.382	2025-07-19 06:29:23.382
V360SIS4GQ	Fantastic Bamboo Shoes	DZWQIGNR	Vibration	New Towels model with 34 GB RAM, 475 GB storage, and nutritious features	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.385	2025-07-19 06:29:23.385
KLS33GBKQ4	Frozen Steel Fish	CJB2KVD6	Vibration	Discover the ostrich-like agility of our Ball, perfect for cheap users	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.387	2025-07-19 06:29:23.387
JEKKZSXPZB	Ergonomic Concrete Table	6MZ9SNJD	None	Savor the delicious essence in our Pants, designed for tender culinary adventures	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:23.39	2025-07-19 06:29:23.39
D3BDNET2V9	Luxurious Bronze Towels	WBNRLNHX	Temperature	Discover the frog-like agility of our Towels, perfect for orange users	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.393	2025-07-19 06:29:23.393
DWZRK8FP9E	Soft Gold Car	ETKCOZSV	None	The Karlee Tuna is the latest in a series of perfumed products from Bogisich, Fisher and Blanda	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:23.396	2025-07-19 06:29:23.396
AU14T995ZM	Tasty Metal Salad	AMT3MYLM	Vibration	New pink Chips with ergonomic design for dirty comfort	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.398	2025-07-19 06:29:23.398
QFY7DVXEBR	Recycled Aluminum Chair	ZG8FRU1H	None	Our hamster-friendly Computer ensures voluminous comfort for your pets	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:23.401	2025-07-19 06:29:23.401
FWTCT6PSTJ	Fresh Bronze Table	DLUVIMYE	Pressure	Innovative Pants featuring strong technology and Metal construction	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:23.403	2025-07-19 06:29:23.403
JW1GAPZS1N	Recycled Granite Chips	KOURBTYE	Vibration	Introducing the Mali-inspired Towels, blending sneaky style with local craftsmanship	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:23.405	2025-07-19 06:29:23.405
TXM4TL4M0H	Ergonomic Granite Mouse	CCSFASZM	Vibration	Savor the rich essence in our Bike, designed for impish culinary adventures	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:23.408	2025-07-19 06:29:23.408
A0DYMSTHWP	Unbranded Plastic Pants	Y3CPRQU4	Humidity	The sleek and passionate Soap comes with yellow LED lighting for smart functionality	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:23.41	2025-07-19 06:29:23.41
V7DC6GDPQT	Elegant Gold Salad	AH7SKEP5	Pressure	Professional-grade Shoes perfect for productive training and recreational use	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:23.413	2025-07-19 06:29:23.413
DDKZQHQZNL	Incredible Silk Cheese	D8MZYN75	Humidity	Our golden-inspired Tuna brings a taste of luxury to your muddy lifestyle	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:23.421	2025-07-19 06:29:23.421
OOHDZIIU0M	Modern Silk Gloves	ORSAIJMJ	Temperature	Sleek Salad designed with Marble for another performance	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:23.425	2025-07-19 06:29:23.425
2PLH0R7VN1	Elegant Bronze Gloves	HW2HJBSB	Pressure	Innovative Pizza featuring graceful technology and Gold construction	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:23.428	2025-07-19 06:29:23.428
BER6WXGPYB	Handmade Wooden Fish	NXQS4AEW	Humidity	New Salad model with 42 GB RAM, 93 GB storage, and gaseous features	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:23.432	2025-07-19 06:29:23.432
YF50MRJANF	Soft Marble Chips	7ZXE8JBF	None	Discover the grubby new Salad with an exciting mix of Wooden ingredients	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:23.435	2025-07-19 06:29:23.435
SWDULGAWZR	Generic Metal Mouse	O6KKFASO	Humidity	The mint green Shirt combines Qatar aesthetics with Titanium-based durability	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:23.438	2025-07-19 06:29:23.438
GPTMFE4BAD	Unbranded Cotton Chicken	PDBVENFV	Temperature	Experience the fuchsia brilliance of our Chair, perfect for muffled environments	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:23.442	2025-07-19 06:29:23.442
YQFM2RJVEZ	Handmade Bamboo Sausages	TSGMXWFP	Vibration	The sleek and unwieldy Tuna comes with tan LED lighting for smart functionality	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.445	2025-07-19 06:29:23.445
MDY9Z3O9CT	Refined Gold Bike	ZSUBBARN	Temperature	Ergonomic Chicken made with Plastic for all-day watery support	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:23.448	2025-07-19 06:29:23.448
FFGHPZZRYF	Recycled Plastic Table	O1S1JWUS	Temperature	The Open-source directional open architecture Bacon offers reliable performance and frank design	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:23.451	2025-07-19 06:29:23.451
YYFBFL6FNX	Oriental Steel Sausages	MX4SJGAD	Humidity	Stylish Sausages designed to make you stand out with dental looks	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.453	2025-07-19 06:29:23.453
6LKX2EMJSU	Luxurious Bamboo Salad	MLOVHR1W	None	Our salty-inspired Fish brings a taste of luxury to your glossy lifestyle	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:23.456	2025-07-19 06:29:23.456
MZOSCRQ9M7	Licensed Metal Car	QOGCSZVO	Vibration	The sleek and infatuated Pants comes with fuchsia LED lighting for smart functionality	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:23.462	2025-07-19 06:29:23.462
ODLG7EBEWV	Fresh Wooden Chicken	LXIH6RT9	Humidity	New Pizza model with 75 GB RAM, 354 GB storage, and agile features	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:23.468	2025-07-19 06:29:23.468
JLQIUNJXRN	Handcrafted Bamboo Sausages	FRJTZAZR	Pressure	Savor the crunchy essence in our Sausages, designed for breakable culinary adventures	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:23.471	2025-07-19 06:29:23.471
NLOFNMVOJC	Ergonomic Gold Keyboard	O46WGWQ5	Humidity	New Bacon model with 93 GB RAM, 199 GB storage, and courageous features	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:23.474	2025-07-19 06:29:23.474
GDFJF7D1WP	Handcrafted Cotton Keyboard	KTGNZPD4	Temperature	Our eagle-friendly Hat ensures probable comfort for your pets	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:23.477	2025-07-19 06:29:23.477
WO8GQOSYA4	Recycled Wooden Ball	TQI8LTIV	Temperature	Discover the peacock-like agility of our Hat, perfect for simplistic users	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:23.48	2025-07-19 06:29:23.48
EWOFDYYJBY	Incredible Marble Towels	HN7STRHS	Vibration	The pink Cheese combines Equatorial Guinea aesthetics with Cerium-based durability	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.482	2025-07-19 06:29:23.482
HFMLUCK7DR	Ergonomic Ceramic Mouse	JSF41E1H	Humidity	The azure Bike combines Central African Republic aesthetics with Titanium-based durability	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:23.485	2025-07-19 06:29:23.485
NJRQV2HN7Z	Ergonomic Gold Mouse	0TVI9KUU	Pressure	Our fluffy-inspired Shirt brings a taste of luxury to your glorious lifestyle	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:23.487	2025-07-19 06:29:23.487
HNWDKPSEJB	Gorgeous Concrete Cheese	FHBDAVFQ	Vibration	Discover the elephant-like agility of our Keyboard, perfect for clueless users	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:23.489	2025-07-19 06:29:23.489
TLGUDGWGBZ	Generic Granite Fish	PEOQPXOT	Pressure	Featuring Iron-enhanced technology, our Chair offers unparalleled authentic performance	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.497	2025-07-19 06:29:23.497
JNASCTUIGE	Generic Concrete Mouse	EI81VRFW	Vibration	The sleek and disloyal Keyboard comes with fuchsia LED lighting for smart functionality	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:23.502	2025-07-19 06:29:23.502
BMSBQTVLM3	Intelligent Aluminum Bike	IQALKGYP	Temperature	Our fluffy-inspired Sausages brings a taste of luxury to your arid lifestyle	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:23.505	2025-07-19 06:29:23.505
1OZAQAQNEP	Frozen Rubber Towels	ECE37WKA	Temperature	The Centralized analyzing neural-net Shirt offers reliable performance and enchanting design	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:23.509	2025-07-19 06:29:23.509
TOSP9IME2V	Handcrafted Silk Pizza	N5NPSECT	Vibration	Introducing the Christmas Island-inspired Tuna, blending hospitable style with local craftsmanship	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:23.512	2025-07-19 06:29:23.512
FPALT5KGFM	Sleek Cotton Chair	7E3YX2KB	Temperature	Hagenes - Reilly's most advanced Chips technology increases queasy capabilities	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.515	2025-07-19 06:29:23.515
YQKSQAUBLR	Ergonomic Rubber Fish	FNPHIVRK	None	New purple Pants with ergonomic design for valuable comfort	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:23.517	2025-07-19 06:29:23.517
U8RD6AFNYH	Modern Aluminum Cheese	DNQOEQPP	None	The sleek and unruly Pizza comes with cyan LED lighting for smart functionality	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:23.519	2025-07-19 06:29:23.519
0EQDGUQFPE	Small Plastic Chips	O9MTAKOL	Humidity	Our shark-friendly Ball ensures needy comfort for your pets	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:23.522	2025-07-19 06:29:23.522
UZC5WTJH2F	Fantastic Concrete Bike	O3NLUBY5	Pressure	New Table model with 25 GB RAM, 330 GB storage, and wrong features	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:23.525	2025-07-19 06:29:23.525
3LTCPAAZUY	Recycled Silk Shoes	HVSEYO7B	Temperature	The Ergonomic heuristic budgetary management Chips offers reliable performance and impure design	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:23.528	2025-07-19 06:29:23.528
BXEEHCTOC9	Elegant Marble Ball	WDXVXOD7	Vibration	Stylish Cheese designed to make you stand out with spiteful looks	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:23.53	2025-07-19 06:29:23.53
GRHRQK5UHT	Soft Bamboo Cheese	2KS5GW2S	Temperature	Senger, Jacobi and Kuphal's most advanced Towels technology increases frozen capabilities	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:23.533	2025-07-19 06:29:23.533
K1KK1ACWOT	Intelligent Metal Bacon	2A5NVFBZ	Pressure	Our gecko-friendly Car ensures caring comfort for your pets	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:23.536	2025-07-19 06:29:23.536
9D15TSBQDT	Gorgeous Bronze Soap	EGW50YGS	Vibration	The Universal intangible monitoring Hat offers reliable performance and which design	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:23.539	2025-07-19 06:29:23.539
IZKRSNEBUK	Oriental Plastic Keyboard	5OACXCLU	Vibration	The sleek and nippy Salad comes with plum LED lighting for smart functionality	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:23.541	2025-07-19 06:29:23.541
M54XJTFN5G	Frozen Metal Keyboard	RYXL98XS	None	Experience the blue brilliance of our Salad, perfect for gracious environments	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.545	2025-07-19 06:29:23.545
OPQUQOQLUK	Small Marble Car	PI9TMYJN	None	Savor the savory essence in our Pizza, designed for youthful culinary adventures	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:23.547	2025-07-19 06:29:23.547
S1C7NHQHMW	Tasty Granite Computer	U9HGNVFU	Humidity	The Exclusive impactful interface Sausages offers reliable performance and inferior design	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:23.55	2025-07-19 06:29:23.55
8PMB6M33KJ	Generic Plastic Pizza	TTQHAKIY	Temperature	New Cheese model with 59 GB RAM, 533 GB storage, and lonely features	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:23.553	2025-07-19 06:29:23.553
ZDFOQKWUWD	Small Plastic Shirt	ZJ399KGC	Humidity	New Bike model with 52 GB RAM, 460 GB storage, and spherical features	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:23.556	2025-07-19 06:29:23.556
XJCMHSAUQ0	Refined Bamboo Car	XHB2HSKT	Humidity	The Stand-alone real-time encryption Mouse offers reliable performance and warped design	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:23.559	2025-07-19 06:29:23.559
AXNXGUDTUQ	Oriental Ceramic Soap	BSUN8IVW	Vibration	Ergonomic Soap made with Gold for all-day short support	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.562	2025-07-19 06:29:23.562
SOWMSDMWSW	Licensed Cotton Chair	BDID7M4C	Temperature	The Alvera Salad is the latest in a series of outgoing products from Mayer LLC	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:23.565	2025-07-19 06:29:23.565
1GIMJBRJH9	Soft Concrete Bike	R5FTDDYS	Humidity	Discover the subdued new Keyboard with an exciting mix of Silk ingredients	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:23.568	2025-07-19 06:29:23.568
LCGRKUXVTV	Oriental Granite Cheese	QUL4JEHO	Vibration	The sleek and palatable Cheese comes with white LED lighting for smart functionality	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:23.57	2025-07-19 06:29:23.57
DSZVTCTVXX	Generic Plastic Car	JCSJDHGN	Humidity	Stylish Cheese designed to make you stand out with dirty looks	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:23.572	2025-07-19 06:29:23.572
DDIPF6GPXG	Fresh Rubber Car	3HOCGPNG	Vibration	The teal Gloves combines Kyrgyz Republic aesthetics with Rhenium-based durability	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:23.577	2025-07-19 06:29:23.577
T5H3STBOHO	Gorgeous Wooden Chair	XJ515LDX	Vibration	New orchid Computer with ergonomic design for fortunate comfort	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.583	2025-07-19 06:29:23.583
HWPBECLF6E	Ergonomic Silk Cheese	FHBMCSEU	Humidity	The ivory Chicken combines Virgin Islands, British aesthetics with Americium-based durability	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:23.586	2025-07-19 06:29:23.586
HIT1BKBX2D	Tasty Concrete Mouse	M7EQBR80	Temperature	Innovative Sausages featuring general technology and Rubber construction	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:23.589	2025-07-19 06:29:23.589
LI0714XUVE	Fantastic Concrete Sausages	VIEO0ELS	Humidity	The Aylin Fish is the latest in a series of scared products from Stoltenberg - Greenfelder	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:23.593	2025-07-19 06:29:23.593
JIHFFEQSL7	Unbranded Gold Towels	JZMDJJNF	Temperature	Our whale-friendly Hat ensures infinite comfort for your pets	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.595	2025-07-19 06:29:23.595
XMVGYPNEJD	Refined Bamboo Bacon	JGUGXV1A	Vibration	The Baylee Shirt is the latest in a series of wilted products from Sawayn and Sons	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:23.597	2025-07-19 06:29:23.597
JOIIHSKIMA	Licensed Bamboo Fish	OYRXD6IR	Temperature	The purple Salad combines French Polynesia aesthetics with Curium-based durability	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:23.599	2025-07-19 06:29:23.599
Y6IIHH1IEJ	Oriental Cotton Table	PTS5E4BT	Temperature	New Cheese model with 46 GB RAM, 223 GB storage, and esteemed features	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:23.602	2025-07-19 06:29:23.602
TACYBG5PPR	Fantastic Metal Car	YGCTYQVA	Vibration	Introducing the Hungary-inspired Cheese, blending potable style with local craftsmanship	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:23.604	2025-07-19 06:29:23.604
BRJNAQWOKG	Fresh Wooden Mouse	AYYJUD8T	None	Professional-grade Chair perfect for flustered training and recreational use	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:23.606	2025-07-19 06:29:23.606
VYUW9MBKDW	Intelligent Granite Shoes	XLTIG5G7	Temperature	Discover the clueless new Keyboard with an exciting mix of Aluminum ingredients	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:23.609	2025-07-19 06:29:23.609
GU2VLQR2BF	Elegant Steel Fish	I4ZVMGET	Vibration	The sleek and strict Salad comes with red LED lighting for smart functionality	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:23.611	2025-07-19 06:29:23.611
SKA2VCKFD1	Ergonomic Plastic Chair	9OM7XBBC	Vibration	Stylish Shoes designed to make you stand out with entire looks	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:23.614	2025-07-19 06:29:23.614
MBGOM39Q8Z	Intelligent Aluminum Ball	6J7TIYSD	Pressure	Professional-grade Bike perfect for powerless training and recreational use	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:23.616	2025-07-19 06:29:23.616
XOBXEAMUOA	Frozen Silk Salad	CCRADGGQ	Humidity	The Adaptive bifurcated database Fish offers reliable performance and grounded design	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.618	2025-07-19 06:29:23.618
H4BJGAVMCR	Bespoke Marble Car	KVHIIU51	Pressure	Featuring Indium-enhanced technology, our Fish offers unparalleled crafty performance	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:23.621	2025-07-19 06:29:23.621
LRPHMQTF9M	Licensed Gold Computer	IFLMZ6FK	Pressure	Introducing the Lebanon-inspired Bike, blending yellowish style with local craftsmanship	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:23.623	2025-07-19 06:29:23.623
SZI6ABQASA	Oriental Ceramic Cheese	YAOVXUQN	None	Innovative Salad featuring judicious technology and Bamboo construction	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:23.631	2025-07-19 06:29:23.631
JGMNWOSDE4	Handcrafted Aluminum Hat	9BFZXTO6	Humidity	The sleek and brown Computer comes with indigo LED lighting for smart functionality	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:23.635	2025-07-19 06:29:23.635
4FABTYSJGH	Rustic Bronze Pizza	7H2DZAYC	Humidity	Our sweet-inspired Bacon brings a taste of luxury to your juicy lifestyle	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:23.639	2025-07-19 06:29:23.639
OTH6KJ8XFV	Sleek Marble Chips	XBAASKDX	Temperature	Discover the lone new Mouse with an exciting mix of Marble ingredients	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:23.643	2025-07-19 06:29:23.643
XCWRXHZ9HI	Rustic Rubber Sausages	VJR9XLWJ	Vibration	Our tender-inspired Pants brings a taste of luxury to your numb lifestyle	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:23.645	2025-07-19 06:29:23.645
0V8AQPTENS	Small Granite Gloves	QJQWGUUX	None	Professional-grade Chicken perfect for stupendous training and recreational use	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.648	2025-07-19 06:29:23.648
F0UIREIANM	Fantastic Granite Keyboard	DSHYDDLG	None	Our horse-friendly Fish ensures hateful comfort for your pets	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:23.65	2025-07-19 06:29:23.65
4S22C8XQSM	Awesome Metal Hat	VQ2L7TYE	Humidity	Experience the teal brilliance of our Sausages, perfect for difficult environments	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:23.656	2025-07-19 06:29:23.656
1QID1RJ7V6	Gorgeous Plastic Fish	CMJVLFII	Pressure	Professional-grade Fish perfect for scornful training and recreational use	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:23.661	2025-07-19 06:29:23.661
GKMYBRGVWG	Intelligent Wooden Sausages	QK0XPR7F	Temperature	Savor the juicy essence in our Towels, designed for variable culinary adventures	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:23.665	2025-07-19 06:29:23.665
5BWXNZK2RU	Tasty Concrete Chips	ATILNIFJ	None	Introducing the Ireland-inspired Keyboard, blending lucky style with local craftsmanship	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:23.668	2025-07-19 06:29:23.668
QU0IZLSAJO	Unbranded Marble Table	CLRX4QDC	None	The sleek and giving Table comes with orange LED lighting for smart functionality	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:23.671	2025-07-19 06:29:23.671
UOWFZJSX6H	Generic Bronze Bacon	39C6KGNK	Humidity	Experience the orchid brilliance of our Keyboard, perfect for decisive environments	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:23.674	2025-07-19 06:29:23.674
HRXAXNMQC9	Handmade Aluminum Keyboard	APG9GTDA	Pressure	Our butterfly-friendly Table ensures enchanted comfort for your pets	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:23.676	2025-07-19 06:29:23.676
BKXRTBUQVS	Handmade Concrete Cheese	YB2NME5O	Temperature	Lesch LLC's most advanced Chicken technology increases raw capabilities	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:23.679	2025-07-19 06:29:23.679
AZ0NCOQAUJ	Elegant Steel Hat	QLDLH9NL	Temperature	Experience the maroon brilliance of our Mouse, perfect for sparkling environments	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:23.681	2025-07-19 06:29:23.681
IXG81DUGLI	Unbranded Bamboo Mouse	CSHPS30Q	Vibration	Stylish Chips designed to make you stand out with made-up looks	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:23.683	2025-07-19 06:29:23.683
Y5CC3A6UCO	Modern Silk Gloves	IQPLOLRG	None	Professional-grade Chair perfect for negligible training and recreational use	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:23.685	2025-07-19 06:29:23.685
WRL9XB8RVY	Practical Metal Fish	IEHN2RLG	Vibration	Stylish Chicken designed to make you stand out with sturdy looks	8ad57719-e332-4791-b279-945394515b36	AVAILABLE	\N	2025-07-19 06:29:23.687	2025-07-19 06:29:23.687
PLX1OMMGRW	Unbranded Granite Keyboard	UEZL2YBD	Humidity	Featuring Phosphorus-enhanced technology, our Chair offers unparalleled candid performance	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.69	2025-07-19 06:29:23.69
ZECPBSQ7VP	Electronic Bamboo Pizza	GBQAYJCG	Vibration	Our koala-friendly Soap ensures snarling comfort for your pets	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:23.692	2025-07-19 06:29:23.692
DZDGOKOXT8	Electronic Bamboo Towels	YCODMJBD	Vibration	The Kadin Shoes is the latest in a series of affectionate products from Durgan - Trantow	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:23.694	2025-07-19 06:29:23.694
PZ5VVRBK4E	Bespoke Granite Cheese	RMVAXZPN	Vibration	The orange Chips combines Liechtenstein aesthetics with Scandium-based durability	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.696	2025-07-19 06:29:23.696
YWD0VYSNJK	Generic Silk Gloves	ALOH8WT1	Temperature	Professional-grade Car perfect for metallic training and recreational use	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:23.698	2025-07-19 06:29:23.698
JUCKDFQ1TH	Fresh Cotton Sausages	QPCKTIM2	Pressure	Ergonomic Gloves made with Marble for all-day free support	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:23.701	2025-07-19 06:29:23.701
BSNGWO5OZ9	Fantastic Ceramic Ball	EIDFEGYK	Pressure	The Integrated composite frame Gloves offers reliable performance and imaginary design	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:23.703	2025-07-19 06:29:23.703
VDOEJI8PKK	Fresh Plastic Soap	LDT8RAE8	Vibration	New gold Chips with ergonomic design for sentimental comfort	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:23.706	2025-07-19 06:29:23.706
44LZIQY4DJ	Practical Bamboo Bike	1FYTQY8P	None	Sleek Salad designed with Gold for last performance	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:23.712	2025-07-19 06:29:23.712
DIEVZHB1FE	Luxurious Metal Pizza	7BR9JQHH	None	Featuring Beryllium-enhanced technology, our Keyboard offers unparalleled bruised performance	825a8f71-6ba5-4319-b627-1e7c147445a5	AVAILABLE	\N	2025-07-19 06:29:23.717	2025-07-19 06:29:23.717
UOPAUDQTVU	Intelligent Wooden Pants	MMAU2EZQ	Vibration	Stylish Towels designed to make you stand out with equatorial looks	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:23.721	2025-07-19 06:29:23.721
40JM8PMWOP	Frozen Gold Chair	CACTF3DF	None	The sleek and snarling Tuna comes with magenta LED lighting for smart functionality	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:23.724	2025-07-19 06:29:23.724
K9QSZLWRL4	Frozen Marble Computer	MUIQVRPG	Humidity	Introducing the Tajikistan-inspired Pizza, blending early style with local craftsmanship	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:23.727	2025-07-19 06:29:23.727
07SZ7FOM90	Tasty Plastic Chicken	G1DUZ7NC	Pressure	Intelligent Shirt designed with Wooden for lean performance	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:23.73	2025-07-19 06:29:23.73
N2MUWTPJQM	Licensed Granite Hat	B5GUKNDQ	Pressure	The sleek and cheap Shoes comes with black LED lighting for smart functionality	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:23.732	2025-07-19 06:29:23.732
2PBJ5IEO7G	Intelligent Rubber Chair	OPZOYZUD	Pressure	The Cary Shirt is the latest in a series of impassioned products from Kessler, Veum and Pfeffer	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:23.734	2025-07-19 06:29:23.734
6XAGATUNLP	Frozen Steel Soap	HVF8J0DL	Temperature	Introducing the Curacao-inspired Soap, blending writhing style with local craftsmanship	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:23.737	2025-07-19 06:29:23.737
3OIJFVIQOU	Refined Plastic Chips	WACK56JL	Temperature	Innovative Salad featuring puzzled technology and Silk construction	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:23.739	2025-07-19 06:29:23.739
VGFQFX1I6R	Oriental Aluminum Bike	HNUJKYY4	Temperature	Innovative Shirt featuring normal technology and Bronze construction	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:23.745	2025-07-19 06:29:23.745
7VV5HWQECP	Rustic Concrete Pants	5SKRYYR0	Pressure	The Quality-focused optimal artificial intelligence Soap offers reliable performance and kooky design	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:23.75	2025-07-19 06:29:23.75
6XUQPT7T1O	Tasty Granite Chicken	7KX8LHLP	None	Experience the silver brilliance of our Tuna, perfect for scared environments	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:23.753	2025-07-19 06:29:23.753
SC6Q3DU94T	Generic Marble Table	ZI9MOJJM	Vibration	Schulist, West and Beer's most advanced Salad technology increases grown capabilities	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:23.757	2025-07-19 06:29:23.757
CACQBTXN5B	Handmade Cotton Cheese	53GXJRUB	Vibration	Introducing the Italy-inspired Chips, blending descriptive style with local craftsmanship	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:23.76	2025-07-19 06:29:23.76
ZIYBODNHNZ	Rustic Granite Cheese	VKSHEECP	Pressure	New lime Table with ergonomic design for coordinated comfort	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:23.763	2025-07-19 06:29:23.763
S5GAZ9VP5E	Handmade Aluminum Bacon	O63WEVOE	Temperature	Discover the sea lion-like agility of our Salad, perfect for known users	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:23.765	2025-07-19 06:29:23.765
0RA4ET4YIP	Bespoke Bamboo Pizza	FMWQUGRF	Temperature	Our sour-inspired Tuna brings a taste of luxury to your reckless lifestyle	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:23.768	2025-07-19 06:29:23.768
FIJN27EQZE	Tasty Metal Hat	CPSEOT7J	Temperature	Savor the sweet essence in our Tuna, designed for considerate culinary adventures	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:23.77	2025-07-19 06:29:23.77
ZUDURNVTW3	Fresh Silk Chips	P90KJ74X	Temperature	The yellow Shoes combines Georgia aesthetics with Gold-based durability	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:23.772	2025-07-19 06:29:23.772
YRDEOMMG4E	Incredible Gold Cheese	VG7J9S1S	None	The Streamlined cohesive monitoring Pants offers reliable performance and foolish design	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:23.778	2025-07-19 06:29:23.778
MNFWINVOPZ	Recycled Marble Cheese	WDZRA9A0	Temperature	The gold Keyboard combines French Polynesia aesthetics with Uranium-based durability	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:23.784	2025-07-19 06:29:23.784
GXW7FV9ARQ	Oriental Ceramic Salad	UJOOMYCB	None	The Stephanie Sausages is the latest in a series of creative products from Gislason - Pagac	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:23.788	2025-07-19 06:29:23.788
OU69UERPB3	Bespoke Granite Fish	FSSJXO0D	Temperature	The Colton Pants is the latest in a series of shoddy products from McKenzie - Cummings	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:23.791	2025-07-19 06:29:23.791
MGDTWRCDNJ	Fresh Silk Sausages	5Z2YZTQM	Vibration	Ergonomic Computer made with Steel for all-day agile support	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:23.794	2025-07-19 06:29:23.794
7FKXDQ6Z9H	Oriental Granite Cheese	TMKEGBMF	Temperature	Our golden-inspired Computer brings a taste of luxury to your mature lifestyle	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:23.801	2025-07-19 06:29:23.801
KMVHJUHHS0	Elegant Steel Mouse	NOQYWTKR	Pressure	Refined Table designed with Silk for flustered performance	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:23.806	2025-07-19 06:29:23.806
EACBK2Q7CI	Fresh Silk Chicken	MV0BDLI7	Vibration	Practical Fish designed with Aluminum for prime performance	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:23.809	2025-07-19 06:29:23.809
D8KF8IAB2N	Bespoke Bamboo Chips	IDYREMXC	Pressure	New yellow Salad with ergonomic design for self-reliant comfort	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:23.812	2025-07-19 06:29:23.812
99D5UVSTWV	Electronic Wooden Chicken	NFEX7PDA	Vibration	Featuring Helium-enhanced technology, our Gloves offers unparalleled clean performance	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:23.815	2025-07-19 06:29:23.815
PJFFNHTRRB	Handmade Cotton Towels	EBAR4EES	Temperature	Our hippopotamus-friendly Tuna ensures stormy comfort for your pets	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:23.817	2025-07-19 06:29:23.817
4QKO4QVS4J	Luxurious Rubber Towels	BTRFM4RQ	Temperature	The green Ball combines Central African Republic aesthetics with Berkelium-based durability	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:23.819	2025-07-19 06:29:23.819
C7VIFA25UE	Recycled Concrete Salad	594WKBOH	Pressure	Our tender-inspired Table brings a taste of luxury to your acclaimed lifestyle	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:23.821	2025-07-19 06:29:23.821
I6PVI4LJQJ	Awesome Silk Pants	ASTRSKEO	Temperature	Featuring Potassium-enhanced technology, our Gloves offers unparalleled mammoth performance	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.824	2025-07-19 06:29:23.824
IM2FNPAO5G	Bespoke Ceramic Ball	OQGGJWQW	Pressure	The Peggie Bike is the latest in a series of fruitful products from Block, Mayer and Boyer	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:23.826	2025-07-19 06:29:23.826
QZWL8N07CD	Intelligent Granite Computer	WCWXNNRP	Humidity	Our sour-inspired Keyboard brings a taste of luxury to your fine lifestyle	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:23.828	2025-07-19 06:29:23.828
FXUWDOS4GM	Awesome Plastic Hat	LHXS40EN	None	The sleek and turbulent Keyboard comes with orange LED lighting for smart functionality	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:23.83	2025-07-19 06:29:23.83
MAT8COFCDR	Practical Metal Mouse	0VGSPJNT	Vibration	Savor the smoky essence in our Towels, designed for wise culinary adventures	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:23.832	2025-07-19 06:29:23.832
RBZODBQC3Y	Unbranded Plastic Gloves	QO33JZO1	None	Stylish Car designed to make you stand out with crooked looks	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:23.835	2025-07-19 06:29:23.835
QW4SDLFOXB	Practical Rubber Bacon	AUS6VYS2	Pressure	Savor the smoky essence in our Salad, designed for flashy culinary adventures	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:23.837	2025-07-19 06:29:23.837
AYY8WUR1WR	Generic Bamboo Pizza	ECLIHPST	None	Our bitter-inspired Bike brings a taste of luxury to your grounded lifestyle	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:23.845	2025-07-19 06:29:23.845
GQRLEZSXQL	Luxurious Gold Hat	LDK3FUML	Humidity	The Programmable neutral contingency Bike offers reliable performance and frivolous design	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:23.849	2025-07-19 06:29:23.849
RIT9BLWCSQ	Recycled Concrete Soap	VS0TP9TT	None	Savor the fluffy essence in our Tuna, designed for tough culinary adventures	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:23.852	2025-07-19 06:29:23.852
ZTIE0Q6JO3	Rustic Metal Car	6UKVQISB	Pressure	New Keyboard model with 47 GB RAM, 947 GB storage, and giving features	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:23.855	2025-07-19 06:29:23.855
IHXGLUKMFW	Fantastic Granite Chips	FYOVFWX5	None	Featuring Gadolinium-enhanced technology, our Bacon offers unparalleled mature performance	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:23.858	2025-07-19 06:29:23.858
ZONYQETDGH	Sleek Silk Bacon	7CDNHDD2	Pressure	Introducing the Finland-inspired Shirt, blending grim style with local craftsmanship	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:23.86	2025-07-19 06:29:23.86
ARS8CLSTRH	Soft Ceramic Sausages	MJFS4GJR	None	Introducing the Bahrain-inspired Chips, blending wrong style with local craftsmanship	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:23.863	2025-07-19 06:29:23.863
WKOREW4AYC	Gorgeous Cotton Mouse	CZHHVXDH	Humidity	New Pants model with 49 GB RAM, 385 GB storage, and snappy features	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:23.865	2025-07-19 06:29:23.865
GQLQKFERDM	Incredible Rubber Ball	QXGUNO24	Pressure	Hauck, Senger and Brown's most advanced Table technology increases ordinary capabilities	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:23.868	2025-07-19 06:29:23.868
SUPVHN753T	Small Steel Pants	XFHBFAMM	Vibration	Savor the crunchy essence in our Gloves, designed for unwritten culinary adventures	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:23.875	2025-07-19 06:29:23.875
LJWQV7SXH6	Licensed Ceramic Keyboard	JEUYPOAT	Temperature	Ergonomic Tuna made with Granite for all-day marvelous support	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:23.879	2025-07-19 06:29:23.879
GCGT6YUSXK	Luxurious Bronze Shirt	ZYVH4IA0	Humidity	Our rich-inspired Mouse brings a taste of luxury to your giving lifestyle	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:23.883	2025-07-19 06:29:23.883
PAL2OXTDMM	Practical Steel Bacon	NA7CPH1H	Pressure	Savor the fresh essence in our Pizza, designed for important culinary adventures	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:23.885	2025-07-19 06:29:23.885
U48ZBPE4SV	Handmade Bamboo Towels	YOTNV6G6	None	Professional-grade Pizza perfect for quick-witted training and recreational use	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.888	2025-07-19 06:29:23.888
5QANJGUD3M	Handmade Aluminum Computer	3B8HJN9C	Temperature	Experience the plum brilliance of our Chair, perfect for delectable environments	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:23.891	2025-07-19 06:29:23.891
ZZIWULMSID	Fresh Bamboo Shirt	7J1GQSTG	Humidity	Innovative Salad featuring candid technology and Metal construction	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:23.893	2025-07-19 06:29:23.893
J1JUJHDJEX	Unbranded Steel Bacon	DDSC0ZML	Vibration	Ergonomic Table made with Marble for all-day potable support	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:23.896	2025-07-19 06:29:23.896
BFQ0SVIDRQ	Incredible Wooden Ball	BW8DODDL	None	The Jade Keyboard is the latest in a series of late products from Kuvalis and Sons	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:23.898	2025-07-19 06:29:23.898
HOJC4TRTBJ	Handmade Concrete Gloves	0SLTISYX	Humidity	Our monkey-friendly Cheese ensures unwilling comfort for your pets	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:23.901	2025-07-19 06:29:23.901
5TCPZKWMOL	Generic Silk Ball	OJWLKITI	Vibration	New Gloves model with 61 GB RAM, 973 GB storage, and thrifty features	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:23.903	2025-07-19 06:29:23.903
Z0ZAOLCGSS	Fantastic Metal Chair	AQX3NPHW	None	The User-centric attitude-oriented synergy Tuna offers reliable performance and assured design	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:23.907	2025-07-19 06:29:23.907
H8XD5JRQNN	Handcrafted Gold Tuna	SDFJDA6I	Humidity	Discover the peacock-like agility of our Towels, perfect for pleased users	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:23.91	2025-07-19 06:29:23.91
VRLKGRMJQW	Luxurious Aluminum Mouse	UKUEC2OX	Pressure	Discover the uneven new Salad with an exciting mix of Concrete ingredients	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:23.912	2025-07-19 06:29:23.912
MWO0YQFLUN	Intelligent Rubber Soap	KU6YVRPQ	None	The Integrated zero trust neural-net Keyboard offers reliable performance and great design	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:23.915	2025-07-19 06:29:23.915
FO8CPTPR6A	Bespoke Bronze Chicken	SL1XFST3	Temperature	Stylish Chair designed to make you stand out with scientific looks	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.917	2025-07-19 06:29:23.917
6J3JIGRQU9	Modern Bamboo Gloves	ALOZSFBY	Pressure	Featuring Rubidium-enhanced technology, our Shoes offers unparalleled teeming performance	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.92	2025-07-19 06:29:23.92
4C9ZUDODXA	Licensed Steel Bike	GYPFHKDS	Pressure	Innovative Towels featuring competent technology and Cotton construction	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:23.923	2025-07-19 06:29:23.923
SE7LDA6H8H	Practical Granite Fish	JAJ56IPX	Humidity	Our fluffy-inspired Salad brings a taste of luxury to your cluttered lifestyle	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.926	2025-07-19 06:29:23.926
ZVCVCW1KSY	Modern Concrete Mouse	VSMZWCJE	Humidity	Experience the purple brilliance of our Computer, perfect for unwilling environments	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:23.933	2025-07-19 06:29:23.933
K2DFLSHXTC	Unbranded Gold Hat	SF6VB1AG	Humidity	Discover the monkey-like agility of our Pizza, perfect for compassionate users	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:23.938	2025-07-19 06:29:23.938
HOEJKE0YHW	Awesome Gold Soap	ISQSCT0D	Pressure	Stylish Chicken designed to make you stand out with diligent looks	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:23.941	2025-07-19 06:29:23.941
XMBYSKSSGS	Fresh Metal Chair	KNOGKVLN	Temperature	Experience the yellow brilliance of our Pants, perfect for stunning environments	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:23.944	2025-07-19 06:29:23.944
7JTFOJR1V9	Elegant Bamboo Shoes	VND2BXJO	Humidity	Bespoke Shoes designed with Ceramic for frozen performance	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:23.947	2025-07-19 06:29:23.947
WRPZRVNQGH	Licensed Marble Keyboard	8YFEJQFG	Vibration	Ergonomic Shirt made with Granite for all-day scared support	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:23.95	2025-07-19 06:29:23.95
ARWJ1DZMO2	Generic Metal Bacon	TBXBNR3I	Humidity	Professional-grade Pants perfect for unwilling training and recreational use	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:23.952	2025-07-19 06:29:23.952
EWXS7CRPZG	Elegant Bamboo Towels	SX22J0SN	Humidity	Professional-grade Keyboard perfect for elliptical training and recreational use	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:23.955	2025-07-19 06:29:23.955
4PRGBB5W3J	Small Steel Car	MMLIMVKR	Pressure	Stylish Sausages designed to make you stand out with these looks	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:23.957	2025-07-19 06:29:23.957
6J9BKGZ7W4	Sleek Cotton Towels	L296RNJC	None	Experience the plum brilliance of our Sausages, perfect for moral environments	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:23.96	2025-07-19 06:29:23.96
L8MOKYNBKE	Fantastic Ceramic Gloves	RJRX3O7D	None	Franecki Inc's most advanced Towels technology increases swift capabilities	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:23.962	2025-07-19 06:29:23.962
UEM951JY1P	Generic Plastic Sausages	CCPOT7ES	Pressure	The ivory Gloves combines Israel aesthetics with Seaborgium-based durability	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:23.965	2025-07-19 06:29:23.965
N2YTMWVEKU	Ergonomic Bronze Tuna	YJ9A6BYE	None	Ergonomic Pizza made with Rubber for all-day knotty support	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:23.967	2025-07-19 06:29:23.967
MOU6SJZLST	Sleek Concrete Bacon	ILZLL8AG	Pressure	Savor the smoky essence in our Bacon, designed for lavish culinary adventures	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:23.97	2025-07-19 06:29:23.97
ECS4SZMMLS	Handmade Metal Fish	95DXEIKV	None	Introducing the Kyrgyz Republic-inspired Chicken, blending average style with local craftsmanship	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:23.972	2025-07-19 06:29:23.972
5DDROLSK2V	Electronic Granite Hat	U8OT8DLP	Humidity	Stylish Keyboard designed to make you stand out with stable looks	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:23.975	2025-07-19 06:29:23.975
X70TWJI30P	Awesome Bronze Pizza	CZOILCZ6	Pressure	The maroon Bike combines Lebanon aesthetics with Protactinium-based durability	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:23.978	2025-07-19 06:29:23.978
N0M0K52QF9	Small Aluminum Shirt	H0QMLA6C	Pressure	Experience the yellow brilliance of our Pants, perfect for jam-packed environments	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:23.98	2025-07-19 06:29:23.98
XACCUQGFZK	Intelligent Cotton Tuna	2O5N7IRQ	Vibration	The Kamryn Pants is the latest in a series of true products from Kuhn LLC	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:23.983	2025-07-19 06:29:23.983
F2T2HRME5G	Practical Metal Towels	IKDLQXO4	Vibration	Innovative Tuna featuring critical technology and Bronze construction	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:23.986	2025-07-19 06:29:23.986
R1AD60DQRW	Small Concrete Cheese	IIXG10OU	None	The sky blue Computer combines Belgium aesthetics with Phosphorus-based durability	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:23.988	2025-07-19 06:29:23.988
IZBFWXDYMR	Sleek Marble Towels	TMVPCIRQ	Vibration	Professional-grade Gloves perfect for expensive training and recreational use	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:23.992	2025-07-19 06:29:23.992
SKIIO81WT3	Licensed Aluminum Bacon	JTKRQAE0	Pressure	Mueller - Emard's most advanced Computer technology increases eminent capabilities	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:23.998	2025-07-19 06:29:23.998
X94K8HKVNW	Awesome Granite Pants	O1URHUQX	Humidity	Ergonomic Car made with Marble for all-day superior support	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.002	2025-07-19 06:29:24.002
WZ2KQSHLU5	Fantastic Wooden Shoes	PMODQLBO	Humidity	The Rosemary Pants is the latest in a series of nervous products from Gutkowski Inc	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:24.005	2025-07-19 06:29:24.005
HFBVVH59KX	Refined Steel Salad	VND2IW1I	Humidity	New plum Ball with ergonomic design for lustrous comfort	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:24.008	2025-07-19 06:29:24.008
P9IABY5CZO	Tasty Wooden Tuna	C2WFEKMH	Temperature	Savor the sour essence in our Fish, designed for illiterate culinary adventures	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:24.011	2025-07-19 06:29:24.011
9PB6QGOJ0S	Luxurious Bamboo Computer	0FLRAPJU	Vibration	Experience the pink brilliance of our Gloves, perfect for hidden environments	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:24.013	2025-07-19 06:29:24.013
5E9RC8R6AO	Electronic Bamboo Gloves	7NEVLXUA	None	The sleek and proper Mouse comes with blue LED lighting for smart functionality	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.016	2025-07-19 06:29:24.016
K9BHNZUHN4	Sleek Silk Chair	8VPES5ZM	None	Introducing the Cambodia-inspired Chicken, blending raw style with local craftsmanship	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.018	2025-07-19 06:29:24.018
EOF37JGGS7	Licensed Metal Cheese	IAXCQ5IY	Temperature	Bosco - Labadie's most advanced Ball technology increases unhappy capabilities	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:24.02	2025-07-19 06:29:24.02
HGLU8ZJEGL	Gorgeous Silk Gloves	EYGAEJFX	Pressure	Discover the snarling new Cheese with an exciting mix of Rubber ingredients	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.022	2025-07-19 06:29:24.022
MVERMIY4NA	Frozen Gold Table	8T9NTCES	Humidity	New sky blue Cheese with ergonomic design for flickering comfort	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.029	2025-07-19 06:29:24.029
HJL74NWAHI	Unbranded Silk Fish	U2OL5HO6	Temperature	Featuring Phosphorus-enhanced technology, our Salad offers unparalleled glorious performance	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:24.034	2025-07-19 06:29:24.034
LRSUHISYRA	Fantastic Rubber Tuna	U5JLYIFB	Vibration	Savor the fresh essence in our Shoes, designed for untimely culinary adventures	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:24.038	2025-07-19 06:29:24.038
FAWN9FQB8X	Luxurious Silk Bacon	SMFUZNLS	Temperature	The maroon Soap combines Peru aesthetics with Livermorium-based durability	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:24.044	2025-07-19 06:29:24.044
VTCZCS0EAO	Elegant Silk Computer	WVMAGIRV	Humidity	Our rabbit-friendly Shirt ensures untidy comfort for your pets	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.046	2025-07-19 06:29:24.046
0J13HWQAQI	Intelligent Aluminum Chicken	EMNGMXB1	Humidity	The Ardella Salad is the latest in a series of mysterious products from Zulauf Inc	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:24.05	2025-07-19 06:29:24.05
5ZSZNK41PT	Handcrafted Plastic Fish	EBJ1SS8H	Humidity	Discover the best new Shirt with an exciting mix of Wooden ingredients	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:24.052	2025-07-19 06:29:24.052
D1NHKSIDWC	Ergonomic Steel Towels	DQHFE8YT	None	Discover the bat-like agility of our Chips, perfect for cool users	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:24.054	2025-07-19 06:29:24.054
HZAMVFTAJF	Recycled Aluminum Mouse	QDS0B1R0	Pressure	Savor the moist essence in our Car, designed for peppery culinary adventures	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:24.056	2025-07-19 06:29:24.056
9IQ8XPIA2R	Ergonomic Cotton Soap	CBYDBTP7	Humidity	Schroeder, Gerlach and Hackett's most advanced Shoes technology increases rigid capabilities	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.06	2025-07-19 06:29:24.06
KJNKN3XAWR	Fresh Concrete Soap	CEKOAI7Z	Vibration	Innovative Gloves featuring lovely technology and Bronze construction	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:24.062	2025-07-19 06:29:24.062
GRYYHFF6WG	Unbranded Bamboo Computer	ENQ2GVSK	None	Savor the savory essence in our Pants, designed for brilliant culinary adventures	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:24.069	2025-07-19 06:29:24.069
IHRMFYWLVR	Small Steel Ball	ERBQABXV	Pressure	Innovative Soap featuring glaring technology and Wooden construction	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.074	2025-07-19 06:29:24.074
EQOG8TMFTY	Handcrafted Aluminum Salad	HLDM8EI3	Humidity	Innovative Car featuring mindless technology and Ceramic construction	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:24.078	2025-07-19 06:29:24.078
GIJDRQANM6	Gorgeous Wooden Fish	5XRC88ZS	Vibration	The grey Computer combines Tokelau aesthetics with Lutetium-based durability	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:24.08	2025-07-19 06:29:24.08
QUO6UDO4FW	Elegant Silk Pants	UYYPLMIS	None	Our ostrich-friendly Mouse ensures junior comfort for your pets	f7a281c3-d025-47b2-944b-8e656a89af1a	AVAILABLE	\N	2025-07-19 06:29:24.083	2025-07-19 06:29:24.083
OD0M6CUOPZ	Fresh Bamboo Gloves	9TP5DGTB	None	Discover the horse-like agility of our Bacon, perfect for uneven users	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:24.086	2025-07-19 06:29:24.086
DYPFZKLMOY	Soft Ceramic Pants	GROTSXWM	Humidity	Innovative Tuna featuring hungry technology and Steel construction	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:24.089	2025-07-19 06:29:24.089
CVF1XNETFT	Bespoke Cotton Sausages	9IHE5SJJ	Vibration	The Scotty Shoes is the latest in a series of trustworthy products from Grady LLC	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:24.094	2025-07-19 06:29:24.094
LAXKIW1WG4	Awesome Marble Tuna	ROOKBJIJ	None	The Devante Chair is the latest in a series of wobbly products from Corkery, Zboncak and Dare	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.1	2025-07-19 06:29:24.1
BGNNLCW1QQ	Licensed Concrete Keyboard	8HBZTW4K	Humidity	Featuring Magnesium-enhanced technology, our Sausages offers unparalleled electric performance	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:24.104	2025-07-19 06:29:24.104
1ADZMKPNZW	Recycled Rubber Salad	2RDY6PZX	Vibration	Beahan, Wolff and Trantow's most advanced Tuna technology increases comfortable capabilities	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.107	2025-07-19 06:29:24.107
YB5LZAEGML	Awesome Metal Mouse	NUDADXOW	None	Our parrot-friendly Gloves ensures sad comfort for your pets	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.11	2025-07-19 06:29:24.11
LZVSFYAR67	Elegant Plastic Keyboard	JLSKLQDA	Temperature	Professional-grade Soap perfect for powerless training and recreational use	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:24.116	2025-07-19 06:29:24.116
VDNRDHR3MT	Tasty Silk Bike	W7SHT6OJ	Vibration	Featuring Tin-enhanced technology, our Keyboard offers unparalleled sweet performance	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:24.121	2025-07-19 06:29:24.121
T0840WN29E	Handmade Gold Gloves	GF6MFZ5O	None	Discover the turtle-like agility of our Hat, perfect for sparse users	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:24.126	2025-07-19 06:29:24.126
HMSELLD8V4	Gorgeous Marble Gloves	COLGE2QU	Pressure	The sleek and faraway Sausages comes with maroon LED lighting for smart functionality	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:24.129	2025-07-19 06:29:24.129
D2XNLEKBBU	Awesome Silk Pants	552U9MBT	None	The Intuitive clear-thinking function Salad offers reliable performance and acceptable design	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:24.131	2025-07-19 06:29:24.131
3A6TZJU2F1	Sleek Marble Shoes	DOC0IQTG	Temperature	New fuchsia Chips with ergonomic design for circular comfort	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:24.134	2025-07-19 06:29:24.134
CI2CYZEPMF	Rustic Bamboo Fish	0R8JX2OT	Temperature	The orchid Ball combines Costa Rica aesthetics with Mercury-based durability	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.136	2025-07-19 06:29:24.136
BXRXDKL24T	Fresh Granite Computer	R0XVSZV9	Vibration	New Ball model with 17 GB RAM, 854 GB storage, and cuddly features	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:24.138	2025-07-19 06:29:24.138
LK6KND5FTX	Bespoke Cotton Gloves	PBCXVQBK	Pressure	The Rubie Salad is the latest in a series of charming products from Jones, Kunde and Veum	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:24.141	2025-07-19 06:29:24.141
INYBUO0BG6	Soft Wooden Pizza	7S7YJNGN	Pressure	Experience the sky blue brilliance of our Hat, perfect for messy environments	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:24.148	2025-07-19 06:29:24.148
JF7KJRPC4Q	Soft Steel Chicken	XR5DKX5M	None	The lime Table combines Aland Islands aesthetics with Hassium-based durability	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:24.152	2025-07-19 06:29:24.152
YYEAIT4UBM	Rustic Marble Shoes	RS4WBV32	Temperature	Introducing the Benin-inspired Sausages, blending overdue style with local craftsmanship	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:24.155	2025-07-19 06:29:24.155
77TF6FGM0M	Luxurious Plastic Keyboard	NJDSSZL1	Humidity	Intelligent Keyboard designed with Concrete for evil performance	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.158	2025-07-19 06:29:24.158
7HA8IHZNLN	Tasty Rubber Chips	FTEKNYGP	Humidity	Featuring Gallium-enhanced technology, our Sausages offers unparalleled these performance	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:24.161	2025-07-19 06:29:24.161
XH5LYGYAS0	Refined Aluminum Shoes	GRGEJR4O	Temperature	Ergonomic Pizza made with Rubber for all-day variable support	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:24.163	2025-07-19 06:29:24.163
MVILIMAQDY	Tasty Steel Pizza	C2ZE4DCQ	Humidity	Ergonomic Car made with Marble for all-day eminent support	8ad57719-e332-4791-b279-945394515b36	AVAILABLE	\N	2025-07-19 06:29:24.165	2025-07-19 06:29:24.165
7CBE0CRGU9	Gorgeous Gold Pizza	SUOMLF2R	Humidity	The Mckayla Shirt is the latest in a series of definitive products from Champlin, Bogisich and Shields	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:24.167	2025-07-19 06:29:24.167
ET5ELBHBUV	Frozen Concrete Salad	WJ3RHHEF	None	The Robust radical database Keyboard offers reliable performance and informal design	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:24.169	2025-07-19 06:29:24.169
2TWBKZC9XJ	Ergonomic Wooden Gloves	JZS2R4R8	Temperature	Discover the peacock-like agility of our Cheese, perfect for spiffy users	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.172	2025-07-19 06:29:24.172
S1FQ85G0DG	Gorgeous Ceramic Towels	YPYQQE8I	Vibration	Our moist-inspired Bacon brings a taste of luxury to your illustrious lifestyle	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:24.177	2025-07-19 06:29:24.177
BJSA6MMJRO	Frozen Bamboo Tuna	ZXI5FVWG	Humidity	Innovative Mouse featuring tempting technology and Aluminum construction	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.182	2025-07-19 06:29:24.182
QM4AHEWDRW	Elegant Rubber Chicken	MADDBNIG	Temperature	Professional-grade Computer perfect for superb training and recreational use	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:24.186	2025-07-19 06:29:24.186
JEV5MXE3C7	Unbranded Gold Towels	FVSA0SLC	Pressure	Experience the silver brilliance of our Chair, perfect for mean environments	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.189	2025-07-19 06:29:24.189
U0A8AX1W58	Bespoke Gold Towels	WCSJLSTN	None	Professional-grade Pizza perfect for fixed training and recreational use	825a8f71-6ba5-4319-b627-1e7c147445a5	AVAILABLE	\N	2025-07-19 06:29:24.192	2025-07-19 06:29:24.192
JQQWN4HW5X	Awesome Plastic Sausages	U3INHSNT	Pressure	Our dog-friendly Salad ensures scary comfort for your pets	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.195	2025-07-19 06:29:24.195
VIVEPARROC	Gorgeous Granite Keyboard	PSCSQFRR	None	Savor the savory essence in our Bike, designed for exotic culinary adventures	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:24.197	2025-07-19 06:29:24.197
OFQV1H2XFH	Refined Rubber Mouse	IAYMMSDN	None	Experience the pink brilliance of our Pizza, perfect for scornful environments	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:24.199	2025-07-19 06:29:24.199
KONWR4501U	Bespoke Gold Ball	ZHKWVVJO	Vibration	Discover the passionate new Tuna with an exciting mix of Metal ingredients	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.202	2025-07-19 06:29:24.202
GALZWL1YKZ	Incredible Marble Keyboard	FYO5GZZF	Temperature	Introducing the Equatorial Guinea-inspired Fish, blending punctual style with local craftsmanship	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.204	2025-07-19 06:29:24.204
XYQR52YJWF	Handcrafted Wooden Bacon	MFI65CKW	None	Stylish Sausages designed to make you stand out with big looks	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:24.207	2025-07-19 06:29:24.207
UXJCTXMWTG	Incredible Silk Chips	ESAUI4FS	Temperature	Innovative Soap featuring unusual technology and Aluminum construction	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.21	2025-07-19 06:29:24.21
IIHXEPHKDT	Intelligent Ceramic Bike	9CORJAM2	Vibration	The Open-source content-based generative AI Gloves offers reliable performance and stunning design	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:24.213	2025-07-19 06:29:24.213
YVCNYCPYSS	Intelligent Ceramic Towels	K4DBYHFM	None	Featuring Barium-enhanced technology, our Pizza offers unparalleled ethical performance	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:24.216	2025-07-19 06:29:24.216
VFC57AHESL	Tasty Plastic Bike	G75GDBWE	None	Featuring Molybdenum-enhanced technology, our Hat offers unparalleled little performance	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:24.219	2025-07-19 06:29:24.219
TV75QWXKCA	Unbranded Metal Mouse	5NLADC69	Humidity	Dickens - Hermann's most advanced Ball technology increases hungry capabilities	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:24.222	2025-07-19 06:29:24.222
W2PEYL6MKS	Tasty Metal Chicken	KTGMPL3A	None	Professional-grade Table perfect for lonely training and recreational use	8ef3dea6-94f6-430f-9099-58b50119b5e6	AVAILABLE	\N	2025-07-19 06:29:24.225	2025-07-19 06:29:24.225
HIQSICV2GZ	Handmade Plastic Cheese	WTJCLMMF	Humidity	Savor the crunchy essence in our Shoes, designed for showy culinary adventures	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:24.228	2025-07-19 06:29:24.228
RYXRGT90DS	Handcrafted Silk Table	FSAIPVKW	None	Hilll, Kuvalis and Beahan's most advanced Car technology increases brisk capabilities	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:24.232	2025-07-19 06:29:24.232
JENMEADSQ4	Incredible Concrete Chips	HN3LN6I6	Temperature	The Spencer Pants is the latest in a series of nutritious products from Harvey - Kertzmann	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:24.235	2025-07-19 06:29:24.235
Z9LJ6TURRG	Elegant Aluminum Cheese	OVAAIHAN	Temperature	Experience the lavender brilliance of our Keyboard, perfect for wasteful environments	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:24.238	2025-07-19 06:29:24.238
ANLYSCXGW8	Tasty Metal Chips	NVLEIYW8	Humidity	The Polarised dynamic hub Table offers reliable performance and genuine design	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:24.241	2025-07-19 06:29:24.241
LRVOOUPF8X	Small Concrete Fish	5TWQTTBC	Temperature	Professional-grade Chair perfect for vague training and recreational use	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:24.244	2025-07-19 06:29:24.244
WTD5CPNDVX	Luxurious Bamboo Salad	A25VJKKM	None	Our crunchy-inspired Salad brings a taste of luxury to your hollow lifestyle	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.247	2025-07-19 06:29:24.247
BQKARM4VNF	Recycled Gold Pizza	KNXVEC9O	Temperature	The Proactive actuating model Car offers reliable performance and mammoth design	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.249	2025-07-19 06:29:24.249
FZ0RJV9GC3	Unbranded Gold Table	M4EP8PGR	Vibration	The sleek and dutiful Car comes with red LED lighting for smart functionality	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:24.255	2025-07-19 06:29:24.255
Q03Q2SA3XK	Generic Steel Fish	O6TONZFJ	Humidity	Discover the peacock-like agility of our Shoes, perfect for astonishing users	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:24.257	2025-07-19 06:29:24.257
KHWHMHYF6O	Luxurious Plastic Salad	CJE7UYUS	Vibration	Innovative Ball featuring cavernous technology and Cotton construction	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:24.261	2025-07-19 06:29:24.261
D1J8ZKJTST	Refined Aluminum Soap	PZLKCIVA	Temperature	Ullrich Inc's most advanced Computer technology increases small capabilities	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:24.263	2025-07-19 06:29:24.263
NDCBEGTNUM	Luxurious Steel Hat	CINMXSO2	Temperature	The Decentralized actuating open architecture Mouse offers reliable performance and pointed design	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.266	2025-07-19 06:29:24.266
PLBUIJWRWU	Gorgeous Aluminum Bacon	Y0YMPRQT	Vibration	Bergstrom, McGlynn and Cremin's most advanced Hat technology increases little capabilities	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:24.268	2025-07-19 06:29:24.268
MV9BWUAPVJ	Gorgeous Aluminum Fish	LRRINVEZ	Vibration	The lavender Chips combines Poland aesthetics with Krypton-based durability	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.271	2025-07-19 06:29:24.271
P4TUTOPONV	Tasty Granite Soap	6U1UVKUE	Humidity	New azure Gloves with ergonomic design for stingy comfort	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.273	2025-07-19 06:29:24.273
HD4SWD2JQE	Rustic Wooden Shoes	IZZ26DMH	Vibration	Our bitter-inspired Chips brings a taste of luxury to your grimy lifestyle	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.281	2025-07-19 06:29:24.281
DWOHA0CPMA	Awesome Metal Pizza	DFTUXDGS	Vibration	Ergonomic Salad made with Ceramic for all-day yellowish support	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:24.285	2025-07-19 06:29:24.285
TLWL9ZLZGH	Sleek Metal Gloves	WWCX3ATD	Temperature	Smitham Group's most advanced Sausages technology increases thin capabilities	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:24.288	2025-07-19 06:29:24.288
WZPLZ04OQZ	Small Cotton Tuna	E7SOS0VN	Temperature	Innovative Chips featuring pure technology and Wooden construction	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.291	2025-07-19 06:29:24.291
3TP09QRAYK	Electronic Silk Gloves	QNAKPW1D	Pressure	The Smart intermediate encryption Chips offers reliable performance and gruesome design	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:24.293	2025-07-19 06:29:24.293
APHQZLDGP6	Awesome Bronze Towels	ZCPHMN3R	None	New Fish model with 42 GB RAM, 995 GB storage, and wicked features	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:24.296	2025-07-19 06:29:24.296
VWRVOWCFIQ	Incredible Plastic Table	PQRNDL6O	Temperature	Elegant Pants designed with Concrete for shy performance	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:24.298	2025-07-19 06:29:24.298
UA9UTDB7AT	Recycled Bamboo Gloves	LRLWIKMF	None	New Shoes model with 83 GB RAM, 310 GB storage, and qualified features	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:24.3	2025-07-19 06:29:24.3
AHRYZ4Q0X4	Generic Silk Bacon	LZNMUWWB	Humidity	Our fish-friendly Chicken ensures foolhardy comfort for your pets	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:24.303	2025-07-19 06:29:24.303
BFLFG0UQTX	Licensed Marble Salad	ORBXWYWA	Humidity	The grey Bike combines Guinea aesthetics with Barium-based durability	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:24.304	2025-07-19 06:29:24.304
VBXJAWADGG	Tasty Granite Tuna	OIYVFAKA	None	Professional-grade Chair perfect for shady training and recreational use	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:24.307	2025-07-19 06:29:24.307
WG7XL2WMJP	Refined Silk Pizza	GVVX75MT	Vibration	Our sour-inspired Sausages brings a taste of luxury to your impartial lifestyle	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.314	2025-07-19 06:29:24.314
SXOGZ0IQ90	Elegant Metal Table	1HS50CNM	Pressure	Ergonomic Table made with Silk for all-day pink support	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.319	2025-07-19 06:29:24.319
UWFLCJR8NG	Recycled Metal Pizza	XRJOHJTM	Temperature	Small Chair designed with Wooden for boiling performance	8ad57719-e332-4791-b279-945394515b36	AVAILABLE	\N	2025-07-19 06:29:24.321	2025-07-19 06:29:24.321
W2NOOLGD9I	Handcrafted Gold Chicken	NIMFKQZD	Vibration	Our moist-inspired Ball brings a taste of luxury to your severe lifestyle	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:24.324	2025-07-19 06:29:24.324
KUWCUS3FY0	Luxurious Plastic Sausages	HXLOC1GB	Vibration	Witting, Veum and Will's most advanced Bacon technology increases meaty capabilities	2d330616-3878-417b-892d-6abdc9ad9f9f	AVAILABLE	\N	2025-07-19 06:29:24.327	2025-07-19 06:29:24.327
2MQ2QX3RYR	Gorgeous Aluminum Keyboard	ELERXBTP	Vibration	The sleek and each Ball comes with cyan LED lighting for smart functionality	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.329	2025-07-19 06:29:24.329
GB2DQOV0GQ	Incredible Silk Pizza	PGRKNKGO	Humidity	Experience the grey brilliance of our Chicken, perfect for wide environments	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:24.331	2025-07-19 06:29:24.331
BZ0QE8KZJN	Electronic Rubber Computer	WR2OHDI5	Temperature	Introducing the Tokelau-inspired Cheese, blending whispered style with local craftsmanship	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:24.334	2025-07-19 06:29:24.334
BCSFMQPUOA	Gorgeous Granite Ball	S5DTKBHG	Pressure	The sleek and oval Fish comes with pink LED lighting for smart functionality	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.336	2025-07-19 06:29:24.336
LOXMYC4XMH	Modern Wooden Cheese	HWOTW7GU	Humidity	Ergonomic Gloves made with Bamboo for all-day funny support	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.338	2025-07-19 06:29:24.338
CUO6GBNLHF	Luxurious Rubber Tuna	OJ2WIXZ8	Pressure	Professional-grade Towels perfect for tragic training and recreational use	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.34	2025-07-19 06:29:24.34
DLRDDUJDX3	Licensed Marble Gloves	Y5OMS5IA	Vibration	Handcrafted Ball designed with Wooden for burdensome performance	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:24.343	2025-07-19 06:29:24.343
KDKYVZZSQN	Sleek Wooden Keyboard	BJGHP80V	Humidity	Our savory-inspired Towels brings a taste of luxury to your animated lifestyle	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:24.345	2025-07-19 06:29:24.345
9WC1VKVIFC	Generic Wooden Pants	FPUTC1YQ	Pressure	Savor the sour essence in our Soap, designed for experienced culinary adventures	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.348	2025-07-19 06:29:24.348
P23OPY65WT	Sleek Silk Fish	D9LBMJZW	Humidity	Fantastic Fish designed with Concrete for unwieldy performance	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.35	2025-07-19 06:29:24.35
CU4RXGSXGN	Sleek Ceramic Pants	7CQZJE5J	Pressure	Professional-grade Hat perfect for mindless training and recreational use	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.352	2025-07-19 06:29:24.352
G7UWXJPCW3	Generic Bamboo Shirt	YBUN1KSY	Vibration	Stylish Fish designed to make you stand out with plain looks	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:24.354	2025-07-19 06:29:24.354
PEJRZSDBPI	Gorgeous Plastic Car	6TVPZKOJ	Temperature	Our wolf-friendly Gloves ensures watery comfort for your pets	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:24.357	2025-07-19 06:29:24.357
BOKHASWDQJ	Licensed Marble Shirt	WFHPY2ZU	None	The sleek and rundown Chips comes with lime LED lighting for smart functionality	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:24.36	2025-07-19 06:29:24.36
SCDZPLRBRV	Sleek Bamboo Ball	ZGEYDAWO	Temperature	Discover the fatal new Sausages with an exciting mix of Gold ingredients	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.362	2025-07-19 06:29:24.362
4DLZPMYLSX	Refined Silk Chicken	YX9BVZ1D	Vibration	Our sour-inspired Shoes brings a taste of luxury to your unhealthy lifestyle	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:24.364	2025-07-19 06:29:24.364
I9LYMEQOZP	Soft Wooden Shoes	PLPOEVOY	Pressure	Our wolf-friendly Shirt ensures selfish comfort for your pets	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:24.366	2025-07-19 06:29:24.366
LJ9EEKPOCQ	Handmade Bronze Computer	ENV8BRTI	Humidity	Stylish Bike designed to make you stand out with important looks	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:24.368	2025-07-19 06:29:24.368
XRIJSS6UAV	Oriental Plastic Towels	RCJCQZOF	Temperature	Savor the delicious essence in our Shoes, designed for far-off culinary adventures	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:24.371	2025-07-19 06:29:24.371
MWU5T6XX2E	Licensed Bronze Keyboard	UNXO7Q1M	Vibration	The sleek and coarse Shirt comes with grey LED lighting for smart functionality	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:24.374	2025-07-19 06:29:24.374
VL6S0AMPSP	Incredible Granite Fish	NOFOGQZW	None	Discover the peaceful new Sausages with an exciting mix of Rubber ingredients	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:24.378	2025-07-19 06:29:24.378
F1ESCDYRY0	Tasty Gold Ball	8KRZPIDI	None	New lavender Keyboard with ergonomic design for innocent comfort	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.381	2025-07-19 06:29:24.381
ZW3E0EXULL	Intelligent Granite Chair	KFAPQ844	Vibration	Professional-grade Bike perfect for hollow training and recreational use	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.384	2025-07-19 06:29:24.384
L2WQHAFA91	Gorgeous Bronze Table	B5PHAFNT	None	Our zesty-inspired Pants brings a taste of luxury to your cheap lifestyle	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:24.388	2025-07-19 06:29:24.388
IS5UUMAKAJ	Refined Concrete Shoes	E2M34FTU	Pressure	The Customizable asynchronous customer loyalty Soap offers reliable performance and instructive design	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:24.394	2025-07-19 06:29:24.394
HIUI6ARNQ0	Handcrafted Gold Shirt	65DVI0DZ	None	Featuring Bismuth-enhanced technology, our Mouse offers unparalleled musty performance	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.4	2025-07-19 06:29:24.4
EMGCESZ8OO	Practical Gold Shoes	IP7EF0ZP	Vibration	New Soap model with 61 GB RAM, 183 GB storage, and plain features	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:24.404	2025-07-19 06:29:24.404
LBXCIJUIWO	Licensed Wooden Table	SQSM3ZPO	None	Ergonomic Soap made with Aluminum for all-day orange support	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:24.407	2025-07-19 06:29:24.407
ITN0URTQOY	Modern Concrete Bike	GRRMS2DV	Humidity	The Profound 24/7 service-desk Computer offers reliable performance and unkempt design	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:24.411	2025-07-19 06:29:24.411
BCVM3E10HA	Gorgeous Metal Table	FK2B7DCF	Pressure	Introducing the Ecuador-inspired Chips, blending amazing style with local craftsmanship	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:24.413	2025-07-19 06:29:24.413
WKHSUV3TTK	Unbranded Bronze Mouse	HVKTIOCS	Temperature	Stylish Mouse designed to make you stand out with needy looks	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.416	2025-07-19 06:29:24.416
VWNA3HEN8F	Handcrafted Bronze Salad	XWVBQ2WD	None	Savor the creamy essence in our Car, designed for sad culinary adventures	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:24.418	2025-07-19 06:29:24.418
XXVDEPQM65	Small Bamboo Chips	ZT6TNU9B	Pressure	Our bat-friendly Pants ensures foolhardy comfort for your pets	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:24.42	2025-07-19 06:29:24.42
4DLOURPIDX	Handcrafted Wooden Car	7GLQGWTF	Pressure	Stylish Chicken designed to make you stand out with crooked looks	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:24.422	2025-07-19 06:29:24.422
IX9VKMX5WG	Licensed Gold Salad	JPYXVX6F	Pressure	New Hat model with 81 GB RAM, 309 GB storage, and quixotic features	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.425	2025-07-19 06:29:24.425
B6NNVKG19X	Ergonomic Rubber Bacon	3J03PFYW	Temperature	The sleek and putrid Cheese comes with turquoise LED lighting for smart functionality	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:24.433	2025-07-19 06:29:24.433
63OHYMYVDH	Intelligent Marble Sausages	OFRNBY9C	Humidity	Discover the gentle new Shirt with an exciting mix of Silk ingredients	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.438	2025-07-19 06:29:24.438
VKQ8BE6JRP	Rustic Bamboo Hat	VQYQUB9X	Vibration	Innovative Fish featuring lucky technology and Steel construction	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.441	2025-07-19 06:29:24.441
CSCYO04VGQ	Handmade Plastic Chicken	EN71DAOE	Humidity	New red Salad with ergonomic design for diligent comfort	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:24.444	2025-07-19 06:29:24.444
3P7UKI9WWA	Awesome Silk Cheese	KSWO1CD6	Temperature	Stylish Pizza designed to make you stand out with sniveling looks	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:24.446	2025-07-19 06:29:24.446
Y9GHHNQ6LT	Awesome Wooden Computer	F4RAEV4Y	None	Our moist-inspired Table brings a taste of luxury to your late lifestyle	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:24.449	2025-07-19 06:29:24.449
HYLULMWJAA	Tasty Gold Chicken	UQIKIKS3	Humidity	The sleek and accurate Chips comes with orchid LED lighting for smart functionality	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.451	2025-07-19 06:29:24.451
87HUINZUST	Generic Metal Chips	2YBYB0CM	Vibration	New Hat model with 93 GB RAM, 406 GB storage, and squiggly features	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:24.453	2025-07-19 06:29:24.453
WUGUHU29SS	Fantastic Wooden Tuna	MCYVQVXG	Humidity	Discover the expensive new Car with an exciting mix of Cotton ingredients	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:24.455	2025-07-19 06:29:24.455
BHCCNWCHNP	Rustic Steel Computer	2SZIZUZE	Temperature	The Distributed uniform focus group Towels offers reliable performance and rundown design	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:24.461	2025-07-19 06:29:24.461
FUHNNQGFEA	Modern Bamboo Tuna	BR2D4UAF	Humidity	The Narciso Shoes is the latest in a series of muffled products from Koepp - Cronin	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:24.467	2025-07-19 06:29:24.467
DJMZUXMSG4	Electronic Plastic Bike	SSA64PDF	Temperature	New violet Hat with ergonomic design for dependent comfort	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.473	2025-07-19 06:29:24.473
OMCSBNP5ZK	Handmade Rubber Pants	REZZCCVO	Temperature	Koss - Durgan's most advanced Sausages technology increases untidy capabilities	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.477	2025-07-19 06:29:24.477
WVMIC0QPGN	Handmade Plastic Ball	QTJVWJIF	Humidity	Featuring Thulium-enhanced technology, our Chicken offers unparalleled impish performance	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:24.479	2025-07-19 06:29:24.479
KEBF2QYS6Y	Incredible Aluminum Chicken	EGWCA0NA	Humidity	Professional-grade Keyboard perfect for perfumed training and recreational use	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.481	2025-07-19 06:29:24.481
DQXFX9J3VE	Rustic Cotton Chips	AGGZUQAB	Vibration	Discover the lovable new Ball with an exciting mix of Steel ingredients	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:24.483	2025-07-19 06:29:24.483
QMC8FRKY3Q	Electronic Aluminum Table	WYVCZ5RQ	Humidity	Crona, Daniel and Nitzsche's most advanced Car technology increases shoddy capabilities	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.486	2025-07-19 06:29:24.486
KUEVG5AEMO	Bespoke Gold Ball	PC6S7OB4	None	Discover the bear-like agility of our Table, perfect for infinite users	f7a281c3-d025-47b2-944b-8e656a89af1a	AVAILABLE	\N	2025-07-19 06:29:24.488	2025-07-19 06:29:24.488
ASKCEH0ICL	Electronic Marble Chair	NXSYWG4N	Humidity	Featuring Polonium-enhanced technology, our Ball offers unparalleled zealous performance	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:24.49	2025-07-19 06:29:24.49
HOCTBUGFKP	Incredible Silk Ball	RM3PQGHK	Vibration	New grey Bacon with ergonomic design for normal comfort	171f2231-319d-4c9c-ad3d-32afb06b9c55	AVAILABLE	\N	2025-07-19 06:29:24.495	2025-07-19 06:29:24.495
TSMMVNW9BB	Licensed Gold Bike	GTDE60G4	Vibration	The Secured 24/7 monitoring Chips offers reliable performance and antique design	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:24.497	2025-07-19 06:29:24.497
HUBQROO728	Gorgeous Rubber Ball	6RKB67BQ	Humidity	New silver Shoes with ergonomic design for grubby comfort	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:24.5	2025-07-19 06:29:24.5
ODDHNCWVEA	Unbranded Gold Pants	UZHVFL4H	Vibration	Oriental Bike designed with Wooden for unaware performance	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:24.502	2025-07-19 06:29:24.502
8IIZAANAKE	Refined Plastic Table	Q756DCRN	Vibration	Introducing the Greenland-inspired Fish, blending political style with local craftsmanship	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.505	2025-07-19 06:29:24.505
KVZKLWFNP8	Generic Concrete Keyboard	GT1TU3AD	Pressure	Soft Shirt designed with Marble for fatal performance	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.507	2025-07-19 06:29:24.507
ZJPNZEG8QZ	Refined Silk Towels	WS7W0WKS	Humidity	Bespoke Car designed with Marble for mindless performance	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:24.51	2025-07-19 06:29:24.51
Z0XT8BLTSS	Electronic Plastic Ball	OMM99WS9	Vibration	Savor the crispy essence in our Fish, designed for impish culinary adventures	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:24.512	2025-07-19 06:29:24.512
ZVMGVEKTWU	Fresh Wooden Chair	T1WNU9W0	None	Experience the teal brilliance of our Chair, perfect for sniveling environments	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.515	2025-07-19 06:29:24.515
BXWGTM53K0	Unbranded Wooden Chicken	HS2ESKIX	None	Discover the whirlwind new Gloves with an exciting mix of Bronze ingredients	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.517	2025-07-19 06:29:24.517
4HIBUFWDJF	Recycled Plastic Shirt	BEOJJVEY	None	Professional-grade Table perfect for scary training and recreational use	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:24.523	2025-07-19 06:29:24.523
MLYWM4GUZZ	Bespoke Wooden Bacon	6S4DDO6G	Vibration	New Salad model with 50 GB RAM, 195 GB storage, and irresponsible features	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.527	2025-07-19 06:29:24.527
7RBPWW10DS	Electronic Cotton Bacon	CLDOPA3M	None	Abernathy - Williamson's most advanced Towels technology increases annual capabilities	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:24.53	2025-07-19 06:29:24.53
TPIHYQHDC8	Elegant Silk Computer	7KT4N3XO	Humidity	Discover the essential new Ball with an exciting mix of Aluminum ingredients	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:24.533	2025-07-19 06:29:24.533
DHBBKIP8XK	Intelligent Rubber Salad	TN6CRPAQ	Pressure	Savor the tangy essence in our Table, designed for hard-to-find culinary adventures	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:24.535	2025-07-19 06:29:24.535
Y9MYKNWQ56	Handmade Aluminum Table	UQZF2D7A	Vibration	Elegant Computer designed with Steel for calculating performance	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:24.538	2025-07-19 06:29:24.538
SEJQ39G9QT	Bespoke Steel Sausages	PH4U3IC8	Vibration	Discover the kangaroo-like agility of our Cheese, perfect for good-natured users	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:24.54	2025-07-19 06:29:24.54
XABSQVILSM	Practical Ceramic Chicken	UGAA0SIY	Vibration	Stylish Chair designed to make you stand out with unhealthy looks	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.543	2025-07-19 06:29:24.543
9Y3QJQ3ARW	Fantastic Marble Pants	X1YM9AVA	None	New Soap model with 11 GB RAM, 117 GB storage, and unkempt features	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.545	2025-07-19 06:29:24.545
DDILIHUNOW	Recycled Gold Chair	7SJZBKHX	Humidity	Ergonomic Soap made with Steel for all-day minty support	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:24.547	2025-07-19 06:29:24.547
QBG3TOAD2Q	Incredible Metal Soap	KPC5YRLJ	Vibration	New green Bacon with ergonomic design for watery comfort	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:24.55	2025-07-19 06:29:24.55
ZALUEAJMKD	Licensed Granite Mouse	1VSNEIEH	Humidity	Discover the hamster-like agility of our Salad, perfect for sick users	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:24.552	2025-07-19 06:29:24.552
8LLLPQJQDI	Refined Marble Towels	9XZHG66J	Temperature	Savor the moist essence in our Towels, designed for each culinary adventures	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:24.557	2025-07-19 06:29:24.557
L7FE8JRQM3	Incredible Aluminum Towels	GWSGA2SO	Temperature	The Deja Ball is the latest in a series of smug products from Runte - Schneider	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:24.564	2025-07-19 06:29:24.564
BBWUXMVZZF	Soft Bronze Fish	MTTLKWMC	Pressure	Featuring Vanadium-enhanced technology, our Chips offers unparalleled polished performance	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:24.567	2025-07-19 06:29:24.567
FSKF4PYBMU	Fantastic Plastic Car	FAR0CCDF	None	New salmon Hat with ergonomic design for wrong comfort	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:24.57	2025-07-19 06:29:24.57
AM7XLIYAUT	Recycled Wooden Car	WYJEWXKQ	Temperature	New Soap model with 98 GB RAM, 343 GB storage, and lovable features	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:24.573	2025-07-19 06:29:24.573
AFJAU1RITO	Rustic Marble Shoes	COY3YHZZ	Humidity	Ergonomic Sausages made with Marble for all-day subdued support	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:24.575	2025-07-19 06:29:24.575
ABEOYOZYAP	Licensed Granite Mouse	TU8ZDUUC	Pressure	Stylish Table designed to make you stand out with honorable looks	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:24.578	2025-07-19 06:29:24.578
AOMTKB2GWF	Elegant Bamboo Chicken	2FKTTLXS	Temperature	Discover the other new Salad with an exciting mix of Granite ingredients	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.58	2025-07-19 06:29:24.58
SMZQHECO3U	Small Ceramic Pizza	8YP6BK1V	Pressure	Our zesty-inspired Gloves brings a taste of luxury to your unwilling lifestyle	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:24.582	2025-07-19 06:29:24.582
VMHYE1X7TU	Modern Rubber Hat	L5BQRQBZ	Pressure	The tan Pants combines Syrian Arab Republic aesthetics with Helium-based durability	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:24.584	2025-07-19 06:29:24.584
AUHTPJRQVF	Generic Bamboo Bacon	OQR4CADL	Humidity	Featuring Iron-enhanced technology, our Soap offers unparalleled second-hand performance	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.587	2025-07-19 06:29:24.587
ANR85HIJDZ	Sleek Marble Shoes	RCH2XH4Q	None	Savor the fresh essence in our Keyboard, designed for empty culinary adventures	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.589	2025-07-19 06:29:24.589
LOAHSUYGWT	Ergonomic Wooden Soap	COLHVCTM	Vibration	The turquoise Chips combines Virgin Islands, British aesthetics with Bromine-based durability	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:24.595	2025-07-19 06:29:24.595
FDH4CPVVRW	Modern Bamboo Mouse	KGROM5JK	Vibration	Gorgeous Chair designed with Rubber for willing performance	ece6754c-4cf1-4838-9f1a-5f79babb12f5	AVAILABLE	\N	2025-07-19 06:29:24.6	2025-07-19 06:29:24.6
JXOXNEY9GH	Modern Plastic Ball	9KJMZPVO	None	Stylish Pants designed to make you stand out with married looks	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.603	2025-07-19 06:29:24.603
DDHCPBLG2F	Oriental Gold Shoes	LCRG4IN7	None	Experience the blue brilliance of our Cheese, perfect for evil environments	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:24.606	2025-07-19 06:29:24.606
GCERJ3BQZL	Small Gold Table	ULIVBF9P	None	Ergonomic Table made with Cotton for all-day esteemed support	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.609	2025-07-19 06:29:24.609
HFWVRBPLE6	Incredible Bronze Tuna	ZOFGBMX1	Vibration	Innovative Sausages featuring insecure technology and Rubber construction	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.612	2025-07-19 06:29:24.612
0CLDQQSZTJ	Bespoke Steel Chips	JWBYSAC6	Vibration	Savor the tender essence in our Tuna, designed for shabby culinary adventures	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:24.614	2025-07-19 06:29:24.614
678XFE43BH	Oriental Granite Table	URHY16L7	None	Discover the crocodile-like agility of our Hat, perfect for good-natured users	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:24.616	2025-07-19 06:29:24.616
XHENDSY7X4	Licensed Concrete Keyboard	CCCPB4UN	Humidity	The sleek and snoopy Pants comes with magenta LED lighting for smart functionality	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.618	2025-07-19 06:29:24.618
F2GDE0APNI	Small Cotton Shirt	5XJCI8PR	Vibration	Braun and Sons's most advanced Computer technology increases prickly capabilities	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:24.621	2025-07-19 06:29:24.621
GIQ4AYUVYF	Awesome Steel Cheese	GIQVN7PH	Humidity	The Alfred Salad is the latest in a series of ill-fated products from Reilly - Dibbert	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:24.622	2025-07-19 06:29:24.622
Q191ZSUVCJ	Handcrafted Ceramic Fish	KT3UXHSQ	None	Experience the purple brilliance of our Chips, perfect for helpful environments	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.629	2025-07-19 06:29:24.629
PCYATJZDK4	Electronic Wooden Bike	PEDUL6TQ	Humidity	Discover the aged new Table with an exciting mix of Granite ingredients	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:24.633	2025-07-19 06:29:24.633
HGIZRHKZHG	Incredible Silk Chicken	MJUCUBP1	Vibration	Hammes Group's most advanced Bacon technology increases dark capabilities	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.637	2025-07-19 06:29:24.637
SOQKM0GJCE	Tasty Bronze Keyboard	VNLTPNRF	Humidity	Featuring Antimony-enhanced technology, our Shirt offers unparalleled grouchy performance	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:24.64	2025-07-19 06:29:24.64
ZKJ5UETUW1	Fresh Granite Computer	HCZDBSHU	Pressure	New Bike model with 85 GB RAM, 544 GB storage, and questionable features	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:24.643	2025-07-19 06:29:24.643
ZO6QQYOUZ7	Recycled Rubber Shirt	ZCIDTWRB	Vibration	The Visionary high-level software Chips offers reliable performance and unwieldy design	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:24.645	2025-07-19 06:29:24.645
CABAPMCCRG	Electronic Wooden Shoes	3GDTRN4A	Pressure	Discover the assured new Keyboard with an exciting mix of Silk ingredients	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.647	2025-07-19 06:29:24.647
UDDRLYTC5Z	Soft Ceramic Hat	EVDDCH7E	None	Fresh Cheese designed with Wooden for surprised performance	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:24.65	2025-07-19 06:29:24.65
212QCSDGLM	Oriental Gold Sausages	ZWPNPSQN	Pressure	Our bitter-inspired Salad brings a taste of luxury to your ignorant lifestyle	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:24.652	2025-07-19 06:29:24.652
XZPUIYDS90	Generic Steel Keyboard	Q0YTFKCY	Pressure	The sleek and clear-cut Shoes comes with orange LED lighting for smart functionality	f7a281c3-d025-47b2-944b-8e656a89af1a	AVAILABLE	\N	2025-07-19 06:29:24.654	2025-07-19 06:29:24.654
OBO196Q08Q	Refined Metal Car	CMJ56LUO	Pressure	Discover the hungry new Computer with an exciting mix of Silk ingredients	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:24.656	2025-07-19 06:29:24.656
HH6N7CAV2E	Recycled Plastic Computer	17GAUCQ1	Temperature	New cyan Hat with ergonomic design for content comfort	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:24.659	2025-07-19 06:29:24.659
A9UTZIX9KN	Luxurious Cotton Pizza	OGFKAJRT	Humidity	Powlowski Inc's most advanced Chips technology increases minor capabilities	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:24.661	2025-07-19 06:29:24.661
WIF3D6ICDY	Elegant Silk Towels	D8VSNCNS	Humidity	New Chair model with 16 GB RAM, 62 GB storage, and immense features	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:24.665	2025-07-19 06:29:24.665
4E1CNOTJEF	Modern Granite Shoes	H1LO0IQY	None	The Configurable maximized analyzer Shoes offers reliable performance and animated design	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:24.671	2025-07-19 06:29:24.671
NNTVG0HI7X	Frozen Gold Gloves	VTFGY90Z	Vibration	Our delicious-inspired Chicken brings a taste of luxury to your hairy lifestyle	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:24.674	2025-07-19 06:29:24.674
0BRSPG0TXX	Ergonomic Steel Cheese	JK2NXT4N	Humidity	The Sustainable optimizing leverage Soap offers reliable performance and blind design	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:24.678	2025-07-19 06:29:24.678
TZMFML71YC	Fantastic Metal Chicken	SWUK40FW	Pressure	Savor the spicy essence in our Cheese, designed for spotless culinary adventures	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.681	2025-07-19 06:29:24.681
AUGCVVP7EK	Small Marble Cheese	E7BKHJI9	Temperature	Prohaska - Sauer's most advanced Chips technology increases private capabilities	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:24.684	2025-07-19 06:29:24.684
RT9EDOQTIT	Incredible Steel Chicken	YZGYE7BI	None	The Joanny Computer is the latest in a series of determined products from Cartwright - Nitzsche	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:24.686	2025-07-19 06:29:24.686
MCDO0J3ARJ	Awesome Steel Computer	DHOQVWIH	Vibration	Savor the creamy essence in our Bike, designed for favorite culinary adventures	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:24.689	2025-07-19 06:29:24.689
MNJBCM9OXF	Sleek Cotton Chips	YQOTJIRV	None	Renner - Ondricka's most advanced Towels technology increases acceptable capabilities	3e74763c-982a-41eb-aec5-fa985eda5aa7	AVAILABLE	\N	2025-07-19 06:29:24.694	2025-07-19 06:29:24.694
YAB3VULQE5	Handmade Plastic Fish	TY7V3GGY	Vibration	Professional-grade Table perfect for spotless training and recreational use	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:24.7	2025-07-19 06:29:24.7
WVWRCWYGYH	Licensed Steel Bacon	LEYGFKZW	Pressure	Our deer-friendly Bacon ensures lone comfort for your pets	1e6191ec-661c-487f-9b91-e0ebde37ff09	AVAILABLE	\N	2025-07-19 06:29:24.704	2025-07-19 06:29:24.704
F0LTM5P1X0	Refined Steel Fish	ZE6VMAH5	Temperature	Ergonomic Tuna made with Cotton for all-day primary support	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:24.708	2025-07-19 06:29:24.708
6614VWKPPF	Generic Gold Hat	I3W7D8Y5	Vibration	Savor the spicy essence in our Shoes, designed for self-assured culinary adventures	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.711	2025-07-19 06:29:24.711
FGFV4ZJ4B1	Generic Cotton Car	FVLVQPAU	None	Ergonomic Chair made with Gold for all-day baggy support	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:24.714	2025-07-19 06:29:24.714
LK6CNKPKO4	Fantastic Metal Shoes	RCSVM0FO	Temperature	Innovative Gloves featuring crazy technology and Concrete construction	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:24.717	2025-07-19 06:29:24.717
DBJUQDRL0R	Fresh Ceramic Chair	FYJ6VNLT	Pressure	Savor the tender essence in our Gloves, designed for nautical culinary adventures	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:24.719	2025-07-19 06:29:24.719
Y8BFNEFMD7	Incredible Steel Soap	JTPZZSIC	Pressure	Featuring Moscovium-enhanced technology, our Towels offers unparalleled imaginative performance	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:24.721	2025-07-19 06:29:24.721
XBLSF3M17O	Rustic Silk Bike	DFMO9Q6R	Vibration	Barrows, Wolf and Prohaska's most advanced Chips technology increases prickly capabilities	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:24.724	2025-07-19 06:29:24.724
LMDG1A87F6	Rustic Rubber Shoes	I0VYCBTU	Humidity	The blue Mouse combines Libyan Arab Jamahiriya aesthetics with Lead-based durability	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:24.731	2025-07-19 06:29:24.731
W25NI37I4G	Tasty Marble Chicken	8KM9VDAD	Vibration	Awesome Shoes designed with Plastic for blind performance	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:24.736	2025-07-19 06:29:24.736
150HRJYDKY	Unbranded Rubber Fish	URRCRYME	None	Experience the azure brilliance of our Bike, perfect for favorite environments	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:24.739	2025-07-19 06:29:24.739
AXRW1K6CVS	Frozen Plastic Bike	ONVOJ97R	Temperature	The Berenice Pants is the latest in a series of pale products from Predovic, Lubowitz and O'Kon	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:24.743	2025-07-19 06:29:24.743
D9WWV7ELAN	Tasty Plastic Cheese	DFXNMQGC	Temperature	Innovative Pants featuring portly technology and Marble construction	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:24.745	2025-07-19 06:29:24.745
1CRYP7XPFO	Tasty Marble Chicken	3TYU20P7	Humidity	Experience the blue brilliance of our Chair, perfect for homely environments	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:24.749	2025-07-19 06:29:24.749
KYMJEPD7UD	Unbranded Plastic Bike	FT9RXFIZ	None	Featuring Bromine-enhanced technology, our Soap offers unparalleled lonely performance	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.752	2025-07-19 06:29:24.752
RQ73UCVPMA	Soft Silk Fish	JVXFZALF	Temperature	Discover the butterfly-like agility of our Shirt, perfect for warm users	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:24.755	2025-07-19 06:29:24.755
7SPWVLAOCX	Tasty Bronze Table	C6NNKXYK	Temperature	Electronic Pants designed with Granite for devoted performance	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:24.757	2025-07-19 06:29:24.757
XC2WYAD79F	Gorgeous Bamboo Shoes	HOQLMQLK	Vibration	The Extended high-level firmware Tuna offers reliable performance and old-fashioned design	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:24.76	2025-07-19 06:29:24.76
UVCNMP1P1P	Modern Bronze Chair	XKBTKBEC	Vibration	The sleek and stylish Tuna comes with grey LED lighting for smart functionality	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:24.762	2025-07-19 06:29:24.762
XE3O09DYQK	Oriental Metal Ball	CWPGWHUQ	Pressure	The Bethany Sausages is the latest in a series of optimistic products from Denesik LLC	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:24.765	2025-07-19 06:29:24.765
5YRT04MQHD	Small Silk Towels	QGTD8QFL	Humidity	Featuring Antimony-enhanced technology, our Shoes offers unparalleled tight performance	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.767	2025-07-19 06:29:24.767
R7JIENDJD6	Bespoke Silk Pizza	502IVQ3J	Pressure	New green Towels with ergonomic design for concerned comfort	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:24.771	2025-07-19 06:29:24.771
2NFTT8LS8M	Fantastic Ceramic Table	LWY8CFLY	None	Savor the fluffy essence in our Pizza, designed for windy culinary adventures	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:24.774	2025-07-19 06:29:24.774
CTXJ3V6PUW	Soft Ceramic Chicken	WKK9HUQP	None	Ergonomic Computer made with Marble for all-day long-term support	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:24.777	2025-07-19 06:29:24.777
QF5T38YLJF	Fresh Bronze Cheese	RK1MMR3H	Pressure	The Annabell Table is the latest in a series of wee products from Quigley, VonRueden and Rohan	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:24.78	2025-07-19 06:29:24.78
0VI5JAEDFY	Refined Metal Salad	KVRZNNLK	Humidity	Handmade Gloves designed with Plastic for good performance	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:24.783	2025-07-19 06:29:24.783
FG0A8LWYU4	Unbranded Gold Computer	OHUUGXBH	Temperature	The Seamless neutral projection Table offers reliable performance and super design	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:24.785	2025-07-19 06:29:24.785
TCRBWZMIGD	Gorgeous Concrete Gloves	I9C3PGIM	Humidity	Professional-grade Sausages perfect for instructive training and recreational use	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:24.787	2025-07-19 06:29:24.787
MQXGWDUS2M	Bespoke Metal Pants	TOGT9XWU	Temperature	Featuring Copper-enhanced technology, our Tuna offers unparalleled wrathful performance	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:24.79	2025-07-19 06:29:24.79
JLI501YARM	Elegant Plastic Car	IAWRZLN0	None	The sleek and some Pizza comes with maroon LED lighting for smart functionality	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:24.793	2025-07-19 06:29:24.793
ASHHYSYXHR	Oriental Concrete Cheese	VHN4Y62D	Vibration	Bechtelar - Wunsch's most advanced Salad technology increases able capabilities	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:24.796	2025-07-19 06:29:24.796
NFPYD7DQKX	Luxurious Concrete Soap	JL0IZIZV	Humidity	Parisian, Davis and Bernhard's most advanced Table technology increases tame capabilities	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:24.798	2025-07-19 06:29:24.798
YUKBETTNUI	Tasty Cotton Ball	W6F1KOYL	Temperature	Experience the white brilliance of our Bike, perfect for rundown environments	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:24.8	2025-07-19 06:29:24.8
SHD6CFKZHL	Fresh Gold Sausages	TAESFMF2	None	Discover the hippopotamus-like agility of our Salad, perfect for ill-fated users	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:24.803	2025-07-19 06:29:24.803
QGKMYD8UED	Handmade Marble Soap	ACAJMDBH	Vibration	Discover the thorny new Keyboard with an exciting mix of Concrete ingredients	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.805	2025-07-19 06:29:24.805
NL0P0K4ZFT	Generic Aluminum Gloves	TVYPKVFV	Temperature	The Reggie Ball is the latest in a series of worldly products from Padberg - Franecki	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:24.808	2025-07-19 06:29:24.808
NMTJOVG7FU	Fantastic Aluminum Fish	YOOPVNT1	Temperature	Innovative Salad featuring thrifty technology and Bamboo construction	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.811	2025-07-19 06:29:24.811
SSEURMMBYF	Modern Metal Table	XCU0H9PS	Temperature	Professional-grade Bacon perfect for wiggly training and recreational use	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.813	2025-07-19 06:29:24.813
CHM6FTGXKW	Recycled Metal Sausages	1KT6NBNO	Vibration	Innovative Soap featuring formal technology and Gold construction	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:24.816	2025-07-19 06:29:24.816
K5EGHOSJ8B	Intelligent Marble Cheese	RUKUE808	Vibration	Stylish Salad designed to make you stand out with coordinated looks	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:24.821	2025-07-19 06:29:24.821
FDGDI6WZRH	Awesome Cotton Towels	67N7PXZX	Pressure	Introducing the Albania-inspired Salad, blending wee style with local craftsmanship	c81130dc-a3b0-4fc4-9973-298bb0baa2dd	AVAILABLE	\N	2025-07-19 06:29:24.826	2025-07-19 06:29:24.826
RQJ7YAMHOV	Unbranded Rubber Fish	YALOTC2K	Pressure	New Sausages model with 74 GB RAM, 31 GB storage, and taut features	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.829	2025-07-19 06:29:24.829
3CFTYJPRLD	Soft Marble Mouse	MQRMXQT9	Vibration	Introducing the Gambia-inspired Keyboard, blending animated style with local craftsmanship	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:24.832	2025-07-19 06:29:24.832
6IUFCPLXDH	Fantastic Granite Car	RVZZWRTJ	Humidity	Experience the fuchsia brilliance of our Keyboard, perfect for quick-witted environments	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:24.835	2025-07-19 06:29:24.835
QFKVW2GXTS	Refined Silk Fish	6GZMOG03	Humidity	Discover the peacock-like agility of our Ball, perfect for intent users	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:24.837	2025-07-19 06:29:24.837
TFPSUYZFQC	Unbranded Gold Tuna	VF9OKQLK	None	Introducing the Indonesia-inspired Shirt, blending sniveling style with local craftsmanship	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.84	2025-07-19 06:29:24.84
K0TVAARWPK	Fantastic Aluminum Pants	3HNZQPQK	Pressure	Innovative Bike featuring handsome technology and Steel construction	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.843	2025-07-19 06:29:24.843
RQYSDG4OVB	Refined Metal Keyboard	MZBDU9DM	Temperature	Murray Inc's most advanced Soap technology increases serene capabilities	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:24.845	2025-07-19 06:29:24.845
S9AAQ51EGL	Tasty Rubber Shirt	YNHEODSQ	Temperature	The Stand-alone intermediate neural-net Salad offers reliable performance and filthy design	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:24.847	2025-07-19 06:29:24.847
G093P1LGUN	Licensed Aluminum Computer	M0LK877W	Pressure	The Synchronised uniform policy Towels offers reliable performance and foolish design	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:24.85	2025-07-19 06:29:24.85
5BP0LWUAG0	Fresh Gold Mouse	JQYYEOPM	Humidity	Our crispy-inspired Keyboard brings a taste of luxury to your crowded lifestyle	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:24.853	2025-07-19 06:29:24.853
CEM8P5ZUFD	Rustic Marble Pants	2JDNOOOZ	None	Our juicy-inspired Tuna brings a taste of luxury to your splendid lifestyle	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.855	2025-07-19 06:29:24.855
FFOO5R1Q0P	Luxurious Granite Hat	3OEPSJWX	Pressure	Refined Gloves designed with Ceramic for yellow performance	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:24.858	2025-07-19 06:29:24.858
6GIBNXFUJ5	Small Rubber Table	M9SOHERP	Pressure	New cyan Chair with ergonomic design for writhing comfort	96077a80-258a-4c59-99d6-757b7078234f	AVAILABLE	\N	2025-07-19 06:29:24.861	2025-07-19 06:29:24.861
NNUD9OZPCP	Gorgeous Gold Sausages	1JNIXQFZ	Pressure	Stylish Computer designed to make you stand out with unselfish looks	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:24.863	2025-07-19 06:29:24.863
VMX0RJD404	Fresh Steel Salad	O1LONIGC	Temperature	Featuring Xenon-enhanced technology, our Chicken offers unparalleled equatorial performance	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:24.866	2025-07-19 06:29:24.866
QSVELYKVQN	Electronic Metal Chips	41AHEB4N	Pressure	Experience the blue brilliance of our Shoes, perfect for silent environments	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:24.868	2025-07-19 06:29:24.868
XUWISA8ZMI	Recycled Cotton Cheese	HGARDQVK	Vibration	Experience the indigo brilliance of our Keyboard, perfect for sick environments	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:24.871	2025-07-19 06:29:24.871
YKC5ADTD49	Frozen Ceramic Sausages	IXC9B80M	Pressure	Featuring Curium-enhanced technology, our Ball offers unparalleled unfit performance	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:24.874	2025-07-19 06:29:24.874
IITMAQ0OX8	Fantastic Rubber Bike	SSWZC5TS	Pressure	Our elephant-friendly Chair ensures unique comfort for your pets	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:24.877	2025-07-19 06:29:24.877
5XBSGGIA9B	Modern Silk Chicken	N6QJGXQ2	Pressure	Ergonomic Chair made with Ceramic for all-day next support	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:24.879	2025-07-19 06:29:24.879
CHCQ95LTO7	Ergonomic Steel Bacon	XPUKFYIV	Humidity	Savor the bitter essence in our Pizza, designed for peaceful culinary adventures	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:24.882	2025-07-19 06:29:24.882
DG50APAN6C	Handcrafted Marble Soap	QOGDZJMR	None	Our savory-inspired Mouse brings a taste of luxury to your foolish lifestyle	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:24.884	2025-07-19 06:29:24.884
ZY6TEODBBL	Sleek Silk Towels	UJOC3JMU	Humidity	Professional-grade Tuna perfect for lavish training and recreational use	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:24.887	2025-07-19 06:29:24.887
LIBK3LWRWN	Unbranded Steel Ball	XTDH7TIG	Vibration	Discover the turtle-like agility of our Towels, perfect for happy users	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:24.891	2025-07-19 06:29:24.891
0Z40YYUZF7	Bespoke Granite Fish	J8BABQIB	Vibration	The Visionary leading edge methodology Chips offers reliable performance and worthless design	50706bb2-63cd-47a1-a03f-f50c65abf149	AVAILABLE	\N	2025-07-19 06:29:24.894	2025-07-19 06:29:24.894
P4LA4XPNP8	Licensed Ceramic Soap	H3CILUY6	None	Discover the hamster-like agility of our Keyboard, perfect for wonderful users	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:24.896	2025-07-19 06:29:24.896
C70JTRHEYJ	Handmade Wooden Car	NYFUGWVS	Humidity	Schaefer and Sons's most advanced Salad technology increases ashamed capabilities	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:24.899	2025-07-19 06:29:24.899
QICCO5NIQ7	Awesome Wooden Mouse	G8NF0QFG	Temperature	Innovative Pizza featuring distant technology and Cotton construction	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:24.901	2025-07-19 06:29:24.901
DQFY6GZSQZ	Oriental Bronze Table	QHIHYDEZ	Pressure	Professional-grade Salad perfect for linear training and recreational use	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:24.904	2025-07-19 06:29:24.904
WLW8JO2CGV	Handmade Wooden Bike	WYZT6HH2	Temperature	New lime Fish with ergonomic design for grave comfort	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:24.906	2025-07-19 06:29:24.906
QGAS3PWGHD	Awesome Wooden Tuna	SJIOMTVN	Humidity	Innovative Computer featuring tangible technology and Silk construction	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:24.912	2025-07-19 06:29:24.912
URVEDJC0HF	Electronic Bronze Shirt	E6KI92BR	Humidity	Zemlak and Sons's most advanced Cheese technology increases scented capabilities	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:24.918	2025-07-19 06:29:24.918
4W2IFKUGWL	Intelligent Silk Bacon	GAPSYAUG	Humidity	New tan Cheese with ergonomic design for negligible comfort	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:24.921	2025-07-19 06:29:24.921
MCA6NECZYK	Practical Wooden Ball	LAQLHSDK	Vibration	New purple Shoes with ergonomic design for orderly comfort	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:24.925	2025-07-19 06:29:24.925
MQEYQQZHOT	Small Bronze Sausages	PZ4UKV94	Humidity	The Annabell Keyboard is the latest in a series of colorless products from Ziemann and Sons	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:24.928	2025-07-19 06:29:24.928
GPX9JO7KS7	Soft Cotton Pants	SDQGCJRA	Vibration	Professional-grade Mouse perfect for first training and recreational use	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:24.93	2025-07-19 06:29:24.93
RQIAG1RDKF	Awesome Cotton Mouse	JOSMV7R9	Temperature	The Multi-tiered maximized service-desk Mouse offers reliable performance and thrifty design	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:24.933	2025-07-19 06:29:24.933
0TZ8RSW4OH	Intelligent Bronze Keyboard	RZWFKVDG	Pressure	Discover the elephant-like agility of our Ball, perfect for unwelcome users	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:24.935	2025-07-19 06:29:24.935
KQI0YR5YTH	Fresh Concrete Cheese	IPYAZZKX	Temperature	Our fresh-inspired Chips brings a taste of luxury to your yearly lifestyle	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:24.937	2025-07-19 06:29:24.937
VP0RYBK4G1	Luxurious Gold Computer	QAEIXI3Y	None	Introducing the Grenada-inspired Chicken, blending secret style with local craftsmanship	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:24.94	2025-07-19 06:29:24.94
EEJLLBJ2WZ	Unbranded Marble Ball	RQBLHIIW	Vibration	The turquoise Tuna combines Belgium aesthetics with Calcium-based durability	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:24.947	2025-07-19 06:29:24.947
FTPN10QQKI	Fantastic Silk Car	DCFGTSMW	Temperature	Soft Bike designed with Bronze for grandiose performance	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:24.952	2025-07-19 06:29:24.952
CHM0EKKTIE	Unbranded Granite Shoes	6FZ1CSOA	Temperature	The Fully-configurable mobile artificial intelligence Towels offers reliable performance and international design	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:24.955	2025-07-19 06:29:24.955
MCSCYETQLV	Generic Silk Bike	ZCJXLC7M	Temperature	Savor the crispy essence in our Towels, designed for determined culinary adventures	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:24.958	2025-07-19 06:29:24.958
XIPU4PQ6O1	Ergonomic Gold Chicken	UPCIWXZP	None	New Salad model with 69 GB RAM, 984 GB storage, and deafening features	e12fb19e-037c-4f02-93b4-ea014d16e151	AVAILABLE	\N	2025-07-19 06:29:24.961	2025-07-19 06:29:24.961
QPKKOVYONF	Bespoke Rubber Shirt	U8TEOD0Z	Pressure	The Future-proofed dedicated flexibility Hat offers reliable performance and substantial design	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:24.964	2025-07-19 06:29:24.964
J8FW1H4SVS	Awesome Cotton Mouse	URHRT9KN	None	Featuring Berkelium-enhanced technology, our Shoes offers unparalleled far-off performance	fda1c3fe-8d63-4c68-b431-dfbaa670d378	AVAILABLE	\N	2025-07-19 06:29:24.966	2025-07-19 06:29:24.966
H4EGENBLY4	Rustic Silk Hat	ZUKTEB63	Vibration	Innovative Cheese featuring trim technology and Ceramic construction	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:24.968	2025-07-19 06:29:24.968
9ZLUJH8JMH	Handmade Concrete Bike	AVMYWNFP	Humidity	The Seamless clear-thinking instruction set Pizza offers reliable performance and trustworthy design	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:24.971	2025-07-19 06:29:24.971
CXBRHMBGIE	Licensed Metal Tuna	LFNEZL5D	Vibration	Featuring Germanium-enhanced technology, our Fish offers unparalleled vague performance	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:24.973	2025-07-19 06:29:24.973
X0ZCLHGXSB	Soft Concrete Keyboard	SGRYZGUQ	None	New azure Chips with ergonomic design for familiar comfort	db6c0c3a-15b0-4017-a924-af68a549410c	AVAILABLE	\N	2025-07-19 06:29:24.976	2025-07-19 06:29:24.976
SZJJULEMOK	Unbranded Marble Sausages	KYWRJRPP	Humidity	Savor the golden essence in our Bike, designed for sociable culinary adventures	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:24.978	2025-07-19 06:29:24.978
TZ3U4VQW9P	Licensed Rubber Chicken	W3CXGJHU	None	The Telly Gloves is the latest in a series of exotic products from Hoeger - Kiehn	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:24.981	2025-07-19 06:29:24.981
HLRYNY1KHZ	Electronic Granite Pizza	UC9Y2GVW	Temperature	Discover the fox-like agility of our Fish, perfect for instructive users	0f245e57-bddc-42c7-9cda-28967da55b0f	AVAILABLE	\N	2025-07-19 06:29:24.99	2025-07-19 06:29:24.99
FXCMCHUQTE	Soft Granite Ball	CR6HUHPQ	None	New green Table with ergonomic design for short comfort	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:24.995	2025-07-19 06:29:24.995
DVWMNMNERS	Modern Concrete Sausages	HAHYRNUA	Temperature	Ergonomic Tuna made with Gold for all-day substantial support	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:24.999	2025-07-19 06:29:24.999
RDXRZJVGUY	Soft Rubber Tuna	A84RSOWL	None	The sleek and deadly Sausages comes with fuchsia LED lighting for smart functionality	305d13c2-e0d7-4b41-bc16-191ad1f5158b	AVAILABLE	\N	2025-07-19 06:29:25.002	2025-07-19 06:29:25.002
UXDKS5IP39	Generic Granite Fish	PSC1ZJXC	None	Professional-grade Fish perfect for giving training and recreational use	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:25.004	2025-07-19 06:29:25.004
UEJWHLXKTX	Elegant Aluminum Keyboard	FALI85SN	Pressure	The cyan Chicken combines Malta aesthetics with Palladium-based durability	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:25.006	2025-07-19 06:29:25.006
ZZMW0EJC4G	Handcrafted Silk Chicken	JXSI5OAX	Humidity	Ergonomic Salad made with Concrete for all-day weary support	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:25.011	2025-07-19 06:29:25.011
DRO6XY2D5F	Frozen Wooden Tuna	YKHDTUWS	Pressure	Experience the azure brilliance of our Tuna, perfect for pleasing environments	539b52b6-288c-420c-a5f9-f98c9ce4bbf0	AVAILABLE	\N	2025-07-19 06:29:25.014	2025-07-19 06:29:25.014
G5OKDMEH27	Handmade Metal Computer	I4JBISPS	Temperature	Our dolphin-friendly Bacon ensures aching comfort for your pets	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:25.017	2025-07-19 06:29:25.017
XIJMOO1ITE	Gorgeous Gold Table	25HGIEL3	Vibration	The tan Salad combines Jordan aesthetics with Krypton-based durability	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:25.019	2025-07-19 06:29:25.019
3LCKON4UFU	Handcrafted Bronze Towels	XODF2V3B	None	New Computer model with 81 GB RAM, 83 GB storage, and jam-packed features	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:25.022	2025-07-19 06:29:25.022
0YGTKUEL4U	Tasty Granite Cheese	V00LPYCI	Vibration	Our rabbit-friendly Bacon ensures mild comfort for your pets	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:25.026	2025-07-19 06:29:25.026
PWDTPCVXUE	Fantastic Gold Pizza	2NGPQJBN	Vibration	The sleek and breakable Cheese comes with magenta LED lighting for smart functionality	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:25.029	2025-07-19 06:29:25.029
ZK1NGJG4KY	Intelligent Marble Computer	M3V5UC5S	Temperature	Experience the orchid brilliance of our Pants, perfect for tense environments	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:25.033	2025-07-19 06:29:25.033
96O8SO6AXX	Handmade Metal Gloves	ORQLDWTD	Temperature	Innovative Bacon featuring comfortable technology and Bamboo construction	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:25.035	2025-07-19 06:29:25.035
LKRUTQPPDM	Bespoke Metal Soap	PJK0HOP6	Temperature	Discover the peacock-like agility of our Chips, perfect for sardonic users	825a8f71-6ba5-4319-b627-1e7c147445a5	AVAILABLE	\N	2025-07-19 06:29:25.037	2025-07-19 06:29:25.037
SWC3HQ9O7H	Generic Plastic Pizza	MIXYZYV0	None	Discover the bogus new Chips with an exciting mix of Wooden ingredients	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:25.04	2025-07-19 06:29:25.04
RFFIEZ0C27	Refined Bronze Tuna	HHQMDJBL	Vibration	Nitzsche LLC's most advanced Shoes technology increases witty capabilities	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:25.043	2025-07-19 06:29:25.043
PM058L0JDF	Fresh Silk Bacon	IJFPY8XY	Vibration	The sleek and babyish Car comes with tan LED lighting for smart functionality	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.046	2025-07-19 06:29:25.046
B8HNUTKXXN	Fresh Cotton Towels	YCZ4ICDX	None	Our sweet-inspired Fish brings a taste of luxury to your warlike lifestyle	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:25.049	2025-07-19 06:29:25.049
LQT2QQVIYW	Sleek Cotton Salad	C6U06OQU	Pressure	Our delicious-inspired Chair brings a taste of luxury to your present lifestyle	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:25.051	2025-07-19 06:29:25.051
08GJQWJYDG	Luxurious Granite Mouse	NJHBNV7H	Temperature	Introducing the Anguilla-inspired Chair, blending unfit style with local craftsmanship	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:25.054	2025-07-19 06:29:25.054
B9FJMNONHY	Practical Wooden Gloves	48R5SRRZ	Temperature	Experience the gold brilliance of our Hat, perfect for inexperienced environments	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:25.056	2025-07-19 06:29:25.056
PTCCEM90XQ	Elegant Aluminum Table	WYETCS4S	Pressure	The sleek and wordy Towels comes with turquoise LED lighting for smart functionality	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:25.059	2025-07-19 06:29:25.059
BLCPH96WW6	Rustic Concrete Shoes	D9TIVE3X	Pressure	The Exclusive disintermediate frame Sausages offers reliable performance and pleasing design	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.061	2025-07-19 06:29:25.061
1WW0VWOINT	Soft Concrete Towels	PSKX2BOV	None	New silver Gloves with ergonomic design for regal comfort	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:25.064	2025-07-19 06:29:25.064
YYHSEGHLZG	Refined Marble Fish	BND5JILD	None	Becker - Lowe's most advanced Car technology increases lawful capabilities	18c611c1-7203-4900-a66e-9ef9e1bc1605	AVAILABLE	\N	2025-07-19 06:29:25.066	2025-07-19 06:29:25.066
RWMGXWOTPX	Handmade Aluminum Chicken	ESQLAT8Z	None	Ergonomic Ball made with Ceramic for all-day delectable support	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:25.068	2025-07-19 06:29:25.068
BDDJB3SC46	Refined Wooden Pants	GBMG1GHR	Temperature	Introducing the French Southern Territories-inspired Pants, blending rowdy style with local craftsmanship	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:25.07	2025-07-19 06:29:25.07
SEP1LYBS2T	Licensed Plastic Chips	I1WR3SZA	Temperature	Stylish Shoes designed to make you stand out with motionless looks	f7a281c3-d025-47b2-944b-8e656a89af1a	AVAILABLE	\N	2025-07-19 06:29:25.072	2025-07-19 06:29:25.072
XVIOHPLANS	Bespoke Steel Shoes	P5GW5MKV	Vibration	Featuring Radium-enhanced technology, our Bacon offers unparalleled clumsy performance	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:25.078	2025-07-19 06:29:25.078
OFKQHBXZRK	Recycled Rubber Fish	CLEEVCJP	Vibration	Featuring Lutetium-enhanced technology, our Tuna offers unparalleled leading performance	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:25.083	2025-07-19 06:29:25.083
ZXPWAMA9G6	Recycled Marble Fish	ALGKAEUZ	Temperature	The sleek and innocent Car comes with tan LED lighting for smart functionality	1892cdc3-ec61-4385-867e-a8e339ff6a11	AVAILABLE	\N	2025-07-19 06:29:25.087	2025-07-19 06:29:25.087
7CSYRKBCJM	Soft Silk Pizza	ECROQ2QE	Pressure	Our crispy-inspired Car brings a taste of luxury to your calculating lifestyle	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:25.09	2025-07-19 06:29:25.09
TBO0LE3ZHV	Fantastic Steel Mouse	JNBZNM1V	Pressure	The sleek and meager Chips comes with white LED lighting for smart functionality	7330454d-f4ec-4ba3-af48-240ceaf36685	AVAILABLE	\N	2025-07-19 06:29:25.093	2025-07-19 06:29:25.093
FUNZBAMNQK	Awesome Silk Car	AAQRW6AD	Vibration	Small Cheese designed with Rubber for blue performance	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:25.095	2025-07-19 06:29:25.095
GWRE64KYP9	Incredible Bamboo Shirt	9XELKKZN	Humidity	Our flamingo-friendly Gloves ensures unhealthy comfort for your pets	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:25.097	2025-07-19 06:29:25.097
J8O3UX2RSW	Refined Steel Keyboard	LFFYR36Q	Humidity	Discover the unfit new Bike with an exciting mix of Gold ingredients	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:25.099	2025-07-19 06:29:25.099
WRX9N0AXL0	Oriental Ceramic Hat	166NC8QK	None	Ergonomic Salad made with Ceramic for all-day wicked support	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:25.102	2025-07-19 06:29:25.102
GR8KZK59LX	Generic Metal Cheese	JNJKV1HK	None	Discover the dim new Ball with an exciting mix of Metal ingredients	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:25.104	2025-07-19 06:29:25.104
C7H7NXHAOK	Electronic Ceramic Fish	KUWNMM1U	Temperature	Experience the maroon brilliance of our Tuna, perfect for live environments	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:25.106	2025-07-19 06:29:25.106
ZXKBEL8KNN	Modern Metal Bacon	FDSWB9RV	Pressure	New Table model with 96 GB RAM, 127 GB storage, and superior features	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:25.111	2025-07-19 06:29:25.111
SXLY6ATW2V	Elegant Plastic Shirt	J70TUR4O	Temperature	New Pants model with 62 GB RAM, 250 GB storage, and black features	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:25.116	2025-07-19 06:29:25.116
H6QYM7DJJF	Handcrafted Cotton Hat	WFOKCVKO	Humidity	The sleek and outgoing Bacon comes with silver LED lighting for smart functionality	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:25.12	2025-07-19 06:29:25.12
HFMWASIWIG	Incredible Gold Sausages	LAE2TMSU	Humidity	Stylish Pizza designed to make you stand out with second looks	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:25.123	2025-07-19 06:29:25.123
W0NV0CQFLJ	Frozen Steel Shoes	10KMPGPH	Humidity	Professional-grade Keyboard perfect for shabby training and recreational use	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:25.126	2025-07-19 06:29:25.126
NJNWSGUMEO	Refined Ceramic Hat	CPGTSIMW	None	Our giraffe-friendly Hat ensures submissive comfort for your pets	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:25.129	2025-07-19 06:29:25.129
3NOZDKHYGF	Bespoke Cotton Bacon	Q8SCBC8J	Vibration	Professional-grade Computer perfect for idealistic training and recreational use	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:25.131	2025-07-19 06:29:25.131
87UMT1JF8W	Frozen Rubber Chicken	WACSPF7V	Temperature	Discover the cooperative new Shirt with an exciting mix of Bronze ingredients	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.133	2025-07-19 06:29:25.133
9W6P6AU2W6	Soft Metal Cheese	FRMSN6VW	Pressure	The teal Pizza combines Switzerland aesthetics with Gold-based durability	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.135	2025-07-19 06:29:25.135
PZW1GHBJZR	Fantastic Aluminum Hat	IBHYK3YQ	Humidity	The Expanded coherent utilisation Tuna offers reliable performance and carefree design	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:25.137	2025-07-19 06:29:25.137
DTNPQAZCHJ	Generic Granite Chicken	ZUPB71ZI	Temperature	Savor the moist essence in our Mouse, designed for untrue culinary adventures	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:25.14	2025-07-19 06:29:25.14
M77BOKOQJU	Fresh Metal Car	GGPN4KVC	Temperature	New Towels model with 3 GB RAM, 99 GB storage, and super features	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:25.146	2025-07-19 06:29:25.146
VKLLT8EHVG	Refined Granite Towels	AXW3XHT6	Vibration	Professional-grade Computer perfect for anguished training and recreational use	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:25.151	2025-07-19 06:29:25.151
ASMVJPZUKF	Tasty Silk Hat	LMD8TDNL	Humidity	Professional-grade Car perfect for tame training and recreational use	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:25.154	2025-07-19 06:29:25.154
ZCNPYRUGUU	Unbranded Ceramic Bike	TMGDVZ8E	Temperature	Discover the untimely new Salad with an exciting mix of Rubber ingredients	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:25.157	2025-07-19 06:29:25.157
ARXQVURAP3	Handcrafted Silk Sausages	MZWX5TDZ	Pressure	Stylish Shirt designed to make you stand out with putrid looks	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:25.16	2025-07-19 06:29:25.16
IFIRIY55QH	Ergonomic Silk Pants	UDQFX83K	Pressure	Innovative Pizza featuring lively technology and Aluminum construction	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:25.162	2025-07-19 06:29:25.162
3JVD1MRWQE	Soft Plastic Pants	ZUMGMEJ2	Vibration	Our moist-inspired Cheese brings a taste of luxury to your authorized lifestyle	f7073e7f-c47f-4765-84a2-7287f610694f	AVAILABLE	\N	2025-07-19 06:29:25.165	2025-07-19 06:29:25.165
DR0DKXPMWB	Handcrafted Granite Chicken	FBBY0WM7	Humidity	Discover the ostrich-like agility of our Shirt, perfect for angelic users	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:25.167	2025-07-19 06:29:25.167
VFKFCX26NL	Practical Bronze Shoes	KJDJQAPR	Vibration	Ergonomic Shirt made with Granite for all-day soulful support	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:25.169	2025-07-19 06:29:25.169
FLDFH2AI3K	Handmade Aluminum Cheese	T32KO8DD	Vibration	New sky blue Chips with ergonomic design for serpentine comfort	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:25.171	2025-07-19 06:29:25.171
LXNLOW768H	Electronic Steel Towels	P9PU2LET	None	The magenta Ball combines Marshall Islands aesthetics with Tin-based durability	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:25.173	2025-07-19 06:29:25.173
BXLOHKWOJK	Generic Metal Bacon	BKI60921	None	Savor the golden essence in our Car, designed for stingy culinary adventures	5ae55c97-6f0e-4591-923d-dbc694471eec	AVAILABLE	\N	2025-07-19 06:29:25.176	2025-07-19 06:29:25.176
UVIMWDBJ4B	Gorgeous Silk Keyboard	BQNPYVTR	Pressure	The sleek and violent Towels comes with orange LED lighting for smart functionality	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:25.178	2025-07-19 06:29:25.178
XLAOCXQZQD	Incredible Concrete Table	8JE8CSEH	Pressure	Stylish Mouse designed to make you stand out with fuzzy looks	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:25.181	2025-07-19 06:29:25.181
O37U4JO5JT	Fantastic Bamboo Computer	MBREILYM	None	Awesome Soap designed with Wooden for proper performance	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:25.183	2025-07-19 06:29:25.183
DA0DEKFNG8	Soft Gold Gloves	XNQEGGDX	None	Experience the ivory brilliance of our Gloves, perfect for definite environments	467186c0-b763-4f66-aef0-5d39e3a70b66	AVAILABLE	\N	2025-07-19 06:29:25.185	2025-07-19 06:29:25.185
IUN1WSAVNS	Ergonomic Steel Shoes	0W5AHBAS	Pressure	Professional-grade Car perfect for nutritious training and recreational use	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:25.188	2025-07-19 06:29:25.188
IELILGDGCQ	Refined Metal Car	VSONNEDL	Vibration	Experience the turquoise brilliance of our Hat, perfect for thin environments	ee5b3af1-6ee9-451e-b6a9-bdb4ba01a39f	AVAILABLE	\N	2025-07-19 06:29:25.19	2025-07-19 06:29:25.19
DO3GADMW3F	Generic Rubber Fish	YFNPQ6JB	None	Goldner LLC's most advanced Pizza technology increases mindless capabilities	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:25.192	2025-07-19 06:29:25.192
SAQANTNHTA	Handmade Rubber Sausages	DOP0WVTX	Vibration	Discover the fish-like agility of our Salad, perfect for second-hand users	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:25.195	2025-07-19 06:29:25.195
JXDITOG0CH	Frozen Aluminum Car	9UIKAAQO	Temperature	Schroeder, Schowalter and Koelpin's most advanced Shoes technology increases cultivated capabilities	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:25.198	2025-07-19 06:29:25.198
VB2PKTNSAJ	Recycled Silk Chair	3PFOEBHD	Temperature	Experience the orchid brilliance of our Shoes, perfect for interesting environments	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:25.2	2025-07-19 06:29:25.2
FWGF3ZRHVF	Fresh Steel Soap	RBP1CWYY	Temperature	Our ostrich-friendly Chips ensures stunning comfort for your pets	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:25.202	2025-07-19 06:29:25.202
PPO0VQR4Z0	Incredible Gold Bacon	GCJVDNBX	Humidity	Featuring Roentgenium-enhanced technology, our Shoes offers unparalleled greedy performance	8f929a23-d481-498d-99a8-b1060c398f07	AVAILABLE	\N	2025-07-19 06:29:25.209	2025-07-19 06:29:25.209
AEW8WUIU4H	Recycled Bamboo Soap	J6C9PTSM	Humidity	Incredible Towels designed with Plastic for authorized performance	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:25.213	2025-07-19 06:29:25.213
5RMLLAQNHX	Generic Steel Bike	W9F9BXVE	Temperature	Generic Towels designed with Metal for rapid performance	c2010a70-c4ed-40f6-8bcd-0ee39b8ab398	AVAILABLE	\N	2025-07-19 06:29:25.216	2025-07-19 06:29:25.216
9SSOUCDFLD	Rustic Marble Bike	A1I9SV2U	None	Savor the fresh essence in our Pants, designed for warlike culinary adventures	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:25.219	2025-07-19 06:29:25.219
2ZQOOY1CMD	Intelligent Cotton Keyboard	DUNAW5XG	None	Stylish Shirt designed to make you stand out with dependent looks	1bf6ba56-1635-45d2-8106-68e09809928f	AVAILABLE	\N	2025-07-19 06:29:25.222	2025-07-19 06:29:25.222
ZYAXN2FNRF	Fantastic Cotton Table	KS3YOZGO	None	Featuring Bohrium-enhanced technology, our Mouse offers unparalleled faint performance	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.224	2025-07-19 06:29:25.224
UJH9YX5LOF	Bespoke Wooden Pants	0QAFMH7J	None	The sleek and hopeful Ball comes with orchid LED lighting for smart functionality	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:25.227	2025-07-19 06:29:25.227
YIESR3ZQNT	Modern Steel Bike	5QG9HBS4	Temperature	New orchid Pizza with ergonomic design for colorless comfort	e993b1e9-4b62-44bd-bd0f-ff670d9574d3	AVAILABLE	\N	2025-07-19 06:29:25.229	2025-07-19 06:29:25.229
KAYIDRSGJX	Fantastic Rubber Tuna	6DUNSPUG	Temperature	Savor the crispy essence in our Chair, designed for thorny culinary adventures	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:25.232	2025-07-19 06:29:25.232
0WSUJ8UNI8	Gorgeous Gold Table	ZMJZKNU8	Pressure	Tasty Shoes designed with Gold for late performance	5c1d57d5-3c8d-4805-93f7-9ef09dfed3dd	AVAILABLE	\N	2025-07-19 06:29:25.236	2025-07-19 06:29:25.236
AYMF8C1SFA	Fresh Bronze Bacon	CCQQICT8	Humidity	Professional-grade Towels perfect for wretched training and recreational use	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:25.242	2025-07-19 06:29:25.242
NHARFEO6BN	Practical Marble Keyboard	GDEMB0BO	None	Our bitter-inspired Bacon brings a taste of luxury to your outgoing lifestyle	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:25.246	2025-07-19 06:29:25.246
ZXXAYCGHUA	Electronic Aluminum Chair	SY0SALB6	Pressure	The Diverse mission-critical paradigm Shoes offers reliable performance and rubbery design	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:25.249	2025-07-19 06:29:25.249
1BLMNVVXIU	Awesome Wooden Hat	3GFVEAO3	Vibration	Our fluffy-inspired Car brings a taste of luxury to your closed lifestyle	0a8d037d-1249-491e-8246-c69b72016b32	AVAILABLE	\N	2025-07-19 06:29:25.252	2025-07-19 06:29:25.252
OQLLN38ILH	Handcrafted Marble Car	MUNJJDP3	Vibration	Stylish Mouse designed to make you stand out with new looks	ece6754c-4cf1-4838-9f1a-5f79babb12f5	AVAILABLE	\N	2025-07-19 06:29:25.255	2025-07-19 06:29:25.255
JVPDDPJJ7N	Bespoke Gold Car	Y7NUEERV	Humidity	Discover the nautical new Shirt with an exciting mix of Gold ingredients	1d3fdb52-0a74-4c0e-97da-3680fd20df9c	AVAILABLE	\N	2025-07-19 06:29:25.257	2025-07-19 06:29:25.257
ITG9UE7LRN	Incredible Concrete Tuna	8NTQYIW5	Vibration	The yellow Computer combines Cote d'Ivoire aesthetics with Rubidium-based durability	fff000fb-b8c6-44f4-9a53-6818908fe490	AVAILABLE	\N	2025-07-19 06:29:25.26	2025-07-19 06:29:25.26
7IC2NUB6NY	Rustic Marble Table	OPDBUCSK	Temperature	Professional-grade Fish perfect for wise training and recreational use	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:25.263	2025-07-19 06:29:25.263
LOHCOV7FHV	Practical Concrete Chicken	RSXD5BHK	Temperature	Featuring Chromium-enhanced technology, our Bike offers unparalleled present performance	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:25.267	2025-07-19 06:29:25.267
YYOI18IOAZ	Intelligent Plastic Pizza	UKZZDX5W	Humidity	The Profound secondary definition Soap offers reliable performance and dreary design	7cc2b825-04a8-4101-a387-e72cbc8619e7	AVAILABLE	\N	2025-07-19 06:29:25.273	2025-07-19 06:29:25.273
JHJOCZY5IG	Generic Wooden Computer	VIMFGYEO	None	The Holly Pants is the latest in a series of bad products from Block, Roberts and Reinger	dde62ce2-604d-4ca4-8aeb-ca5d785ec546	AVAILABLE	\N	2025-07-19 06:29:25.278	2025-07-19 06:29:25.278
TPMSPGAKI8	Fresh Bamboo Bike	ZBQTLSAF	Pressure	Experience the plum brilliance of our Towels, perfect for cruel environments	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:25.281	2025-07-19 06:29:25.281
A7TINLBDRQ	Fantastic Rubber Bacon	OUSI4C77	Pressure	New Mouse model with 54 GB RAM, 960 GB storage, and leading features	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:25.284	2025-07-19 06:29:25.284
Q7LOIEA50Z	Refined Concrete Keyboard	CL49APY5	Humidity	Innovative Hat featuring vivacious technology and Rubber construction	2050b343-c3fa-43e0-9b85-5a879755e599	AVAILABLE	\N	2025-07-19 06:29:25.286	2025-07-19 06:29:25.286
5SQ1VMQVBW	Elegant Silk Cheese	VMMSACYJ	Temperature	Experience the violet brilliance of our Fish, perfect for shabby environments	f5a9bfb7-826e-47b6-af43-b29457ec2e0c	AVAILABLE	\N	2025-07-19 06:29:25.289	2025-07-19 06:29:25.289
NLRFDNQQ1B	Electronic Bronze Chair	1WHHF4UQ	None	Discover the cow-like agility of our Sausages, perfect for trim users	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:25.291	2025-07-19 06:29:25.291
UNAYOCELOD	Fantastic Bronze Keyboard	D1LFYW9U	Vibration	The lime Salad combines Micronesia aesthetics with Radium-based durability	44918f04-a92b-4a8a-abc4-7ebd8b957179	AVAILABLE	\N	2025-07-19 06:29:25.294	2025-07-19 06:29:25.294
WA2DITR62K	Handmade Wooden Keyboard	VUCAAOLC	Pressure	The Hubert Computer is the latest in a series of critical products from Graham - Renner	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:25.299	2025-07-19 06:29:25.299
DUSCIUVE45	Tasty Silk Sausages	KG55DV64	None	New white Bike with ergonomic design for nocturnal comfort	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:25.305	2025-07-19 06:29:25.305
HB01ZYIURT	Tasty Concrete Pants	Q6AHBGGM	Pressure	Discover the lion-like agility of our Computer, perfect for drab users	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:25.31	2025-07-19 06:29:25.31
IS3RENB5W0	Sleek Concrete Gloves	YS0MACHK	None	The cyan Cheese combines Suriname aesthetics with Bromine-based durability	a6b64257-eedb-4257-adc2-20edb25c72e3	AVAILABLE	\N	2025-07-19 06:29:25.313	2025-07-19 06:29:25.313
SJTDKCBKX7	Intelligent Bamboo Fish	DDKGTCKO	Vibration	New white Towels with ergonomic design for downright comfort	0f19ddab-436c-4c1e-8641-c9309ae7598f	AVAILABLE	\N	2025-07-19 06:29:25.316	2025-07-19 06:29:25.316
PP7XBKUZTW	Small Cotton Chicken	DPCH4IW9	Temperature	New Computer model with 86 GB RAM, 123 GB storage, and unwelcome features	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:25.318	2025-07-19 06:29:25.318
ARVPVV5UBL	Recycled Metal Towels	4DZDAO1S	Pressure	Stylish Hat designed to make you stand out with aware looks	c1d174ab-e4d6-4a4e-a4c5-d80b978c2043	AVAILABLE	\N	2025-07-19 06:29:25.32	2025-07-19 06:29:25.32
I39F5ZVWEE	Ergonomic Gold Mouse	G3FNJVC7	None	Innovative Pants featuring foolhardy technology and Marble construction	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:25.323	2025-07-19 06:29:25.323
RCT7M4AECZ	Tasty Steel Computer	HYURFSED	Pressure	Our bee-friendly Shirt ensures unsteady comfort for your pets	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:25.329	2025-07-19 06:29:25.329
DNKLEGROZG	Electronic Ceramic Tuna	J5CGELYF	Pressure	Discover the jittery new Keyboard with an exciting mix of Rubber ingredients	825a8f71-6ba5-4319-b627-1e7c147445a5	AVAILABLE	\N	2025-07-19 06:29:25.332	2025-07-19 06:29:25.332
6NGMLDZIWK	Fantastic Silk Computer	AGQ0SFCT	Temperature	Our crispy-inspired Sausages brings a taste of luxury to your breakable lifestyle	7e2415f4-ac92-4f1b-8600-163a064d1810	AVAILABLE	\N	2025-07-19 06:29:25.334	2025-07-19 06:29:25.334
ZGZKO2FJ80	Oriental Ceramic Soap	5NCMVURB	Temperature	Savor the fresh essence in our Fish, designed for political culinary adventures	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:25.336	2025-07-19 06:29:25.336
PEVELBZTSL	Generic Marble Fish	RT6XHN4R	Humidity	Discover the panda-like agility of our Gloves, perfect for strange users	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:25.339	2025-07-19 06:29:25.339
HOCOQPY6UG	Fantastic Ceramic Ball	ER4NQLLZ	Pressure	New magenta Chips with ergonomic design for international comfort	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:25.342	2025-07-19 06:29:25.342
G8VQHAYT6T	Sleek Ceramic Gloves	K7H9LPQV	Humidity	Our creamy-inspired Pants brings a taste of luxury to your giving lifestyle	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:25.345	2025-07-19 06:29:25.345
TK4XWYUNYE	Bespoke Wooden Towels	QPBYGN3W	Temperature	Professional-grade Gloves perfect for easy training and recreational use	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:25.347	2025-07-19 06:29:25.347
KUE8MQAEEF	Bespoke Steel Soap	LHBHROGV	None	Ergonomic Cheese made with Plastic for all-day acceptable support	37491c69-bb3b-4f6a-b51f-1e6ccfe65e18	AVAILABLE	\N	2025-07-19 06:29:25.35	2025-07-19 06:29:25.35
OFS0BKY7TX	Incredible Concrete Pizza	1CMKHF1E	Pressure	Discover the honorable new Soap with an exciting mix of Ceramic ingredients	3ea64cdc-e5cb-45f3-ad43-c9b75092e8b7	AVAILABLE	\N	2025-07-19 06:29:25.352	2025-07-19 06:29:25.352
WFHVJVLDJU	Bespoke Granite Towels	OJCEC9TI	None	Elegant Soap designed with Plastic for foolish performance	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:25.355	2025-07-19 06:29:25.355
MRKRLBGZC7	Elegant Bronze Car	EFUFX8ZK	None	Rustic Chair designed with Bamboo for leading performance	0c43f622-4d04-491f-b289-afb8fe8fdbe5	AVAILABLE	\N	2025-07-19 06:29:25.358	2025-07-19 06:29:25.358
NGGOWTQKGB	Oriental Ceramic Fish	2LZXWXNG	Vibration	The Jermey Bike is the latest in a series of golden products from Beahan Group	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:25.362	2025-07-19 06:29:25.362
TPUZRLY6MV	Practical Bamboo Computer	YE0W4O8H	Humidity	Experience the silver brilliance of our Salad, perfect for immense environments	b23d0d9e-4ad6-43b6-a20e-216fc30d0f2d	AVAILABLE	\N	2025-07-19 06:29:25.365	2025-07-19 06:29:25.365
IXYXJEDTWZ	Small Steel Soap	6EZIRCPM	Temperature	Ergonomic Mouse made with Wooden for all-day reasonable support	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:25.367	2025-07-19 06:29:25.367
ACERJMXDNR	Elegant Metal Bike	TJX3NKXT	Pressure	Experience the violet brilliance of our Cheese, perfect for altruistic environments	266afc86-ab3c-4ca5-9730-62cb935de16a	AVAILABLE	\N	2025-07-19 06:29:25.369	2025-07-19 06:29:25.369
G8LAMSWFEP	Luxurious Silk Sausages	4TFVQBBZ	Humidity	The Grant Computer is the latest in a series of woeful products from Romaguera and Sons	ba66d600-62a1-40bd-a49c-2a3a7bf54013	AVAILABLE	\N	2025-07-19 06:29:25.372	2025-07-19 06:29:25.372
0TRDNUMBFA	Handmade Bamboo Gloves	WCXAIGYF	None	Luxurious Cheese designed with Wooden for flickering performance	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:25.375	2025-07-19 06:29:25.375
SMWE4K5HNA	Soft Concrete Hat	EXO0WO5R	Pressure	Our crunchy-inspired Chair brings a taste of luxury to your bustling lifestyle	43caa677-b0cd-4abc-98d8-204728a50adb	AVAILABLE	\N	2025-07-19 06:29:25.378	2025-07-19 06:29:25.378
FY7ACAGR53	Luxurious Bronze Soap	2NKPVFHD	Humidity	Introducing the Dominica-inspired Towels, blending inexperienced style with local craftsmanship	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:25.38	2025-07-19 06:29:25.38
NRR1BHJ975	Modern Rubber Pants	L0ESLSCP	None	The orange Salad combines Sweden aesthetics with Erbium-based durability	4e722808-9aaa-4af0-b952-dd530fa1a69c	AVAILABLE	\N	2025-07-19 06:29:25.382	2025-07-19 06:29:25.382
P2UKFN6EJK	Bespoke Gold Keyboard	0S8X8PEL	Temperature	The Virtual attitude-oriented database Car offers reliable performance and enchanted design	e0359af0-2aa9-4ea2-83e8-e3621eb1c52e	AVAILABLE	\N	2025-07-19 06:29:25.385	2025-07-19 06:29:25.385
6EKROWLZLC	Electronic Bronze Sausages	UC3QRLP0	None	Experience the blue brilliance of our Towels, perfect for gummy environments	d683cb3f-b9a3-4c29-b209-5916b5bc0a0a	AVAILABLE	\N	2025-07-19 06:29:25.387	2025-07-19 06:29:25.387
TA0OX2YBS3	Ergonomic Wooden Chicken	20EJR5DQ	None	Discover the worthy new Salad with an exciting mix of Cotton ingredients	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:25.39	2025-07-19 06:29:25.39
RYTKLYQNZR	Recycled Plastic Computer	DSOC7NNA	Pressure	Discover the giraffe-like agility of our Keyboard, perfect for obedient users	4b10a897-6e67-497e-bf21-9250df6799ff	AVAILABLE	\N	2025-07-19 06:29:25.396	2025-07-19 06:29:25.396
W2Y0JLYJEH	Sleek Ceramic Gloves	E4DJLQAK	Humidity	The sleek and hospitable Salad comes with gold LED lighting for smart functionality	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:25.401	2025-07-19 06:29:25.401
33CJTCMA00	Ergonomic Marble Hat	CZ26ZT4J	Vibration	Stylish Bacon designed to make you stand out with impish looks	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:25.404	2025-07-19 06:29:25.404
5OI3KZEY8S	Refined Plastic Shirt	DA10ZCQ0	None	Introducing the Ukraine-inspired Pants, blending finished style with local craftsmanship	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:25.408	2025-07-19 06:29:25.408
TIJ06YOZDA	Fantastic Gold Pants	UHIEERHX	Pressure	The sleek and formal Cheese comes with red LED lighting for smart functionality	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:25.411	2025-07-19 06:29:25.411
J004TFJGMX	Recycled Wooden Chicken	RPDOI5TX	Vibration	Experience the red brilliance of our Keyboard, perfect for primary environments	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:25.413	2025-07-19 06:29:25.413
OWFGZEJO8Q	Ergonomic Silk Gloves	AQY3BBCI	None	Featuring Tin-enhanced technology, our Pizza offers unparalleled dirty performance	db1f82d6-b4ac-4bd7-907d-0755ccbb8c42	AVAILABLE	\N	2025-07-19 06:29:25.415	2025-07-19 06:29:25.415
AGYJA2GX7A	Licensed Cotton Bacon	ZQV9X12F	Temperature	Featuring Xenon-enhanced technology, our Cheese offers unparalleled knowledgeable performance	5c1e421b-1407-456e-a789-b7d4dc0caa5e	AVAILABLE	\N	2025-07-19 06:29:25.418	2025-07-19 06:29:25.418
2T68L2HL7S	Modern Plastic Gloves	9J8TCXIL	None	The purple Towels combines Northern Mariana Islands aesthetics with Astatine-based durability	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:25.42	2025-07-19 06:29:25.42
WLJFY6MFQD	Tasty Ceramic Cheese	J8Y35AOC	Vibration	The Leonel Mouse is the latest in a series of chilly products from Howell, Hackett and Gorczany	9f6f6f25-57f0-4ff3-bd94-e1f15e1b6c24	AVAILABLE	\N	2025-07-19 06:29:25.423	2025-07-19 06:29:25.423
ZH0BVUHHKF	Handcrafted Concrete Tuna	KXMOT2IW	None	The sleek and eminent Salad comes with violet LED lighting for smart functionality	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:25.426	2025-07-19 06:29:25.426
VQGCEWPWTT	Frozen Plastic Shirt	OUCV0LXK	Humidity	Introducing the New Caledonia-inspired Tuna, blending bogus style with local craftsmanship	78469888-1431-4e5b-90e5-087bd324891c	AVAILABLE	\N	2025-07-19 06:29:25.428	2025-07-19 06:29:25.428
KTDTD2AMDS	Awesome Steel Mouse	DWFPQEPM	Humidity	Discover the bogus new Hat with an exciting mix of Granite ingredients	9e94b5ba-2463-4e03-8df1-d5a743c7f287	AVAILABLE	\N	2025-07-19 06:29:25.431	2025-07-19 06:29:25.431
ZTPZGVBYUH	Refined Rubber Chips	CDO9JVOF	Pressure	New Bike model with 55 GB RAM, 405 GB storage, and gripping features	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:25.433	2025-07-19 06:29:25.433
LMXZUIVIHN	Licensed Steel Chicken	PVNMAO6G	None	Discover the tiger-like agility of our Ball, perfect for sniveling users	9046d6b3-4ffd-4df8-87f0-b23cddbc77f1	AVAILABLE	\N	2025-07-19 06:29:25.435	2025-07-19 06:29:25.435
0QPTML9ND0	Small Rubber Sausages	WJKVCACP	Vibration	Discover the obedient new Soap with an exciting mix of Ceramic ingredients	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:25.438	2025-07-19 06:29:25.438
EG2SRZFQNL	Soft Ceramic Pizza	HGRV80B0	Humidity	Featuring Actinium-enhanced technology, our Chips offers unparalleled buttery performance	9bd0a2ef-aab4-4be5-b7a9-a724e2b3406d	AVAILABLE	\N	2025-07-19 06:29:25.44	2025-07-19 06:29:25.44
9IK4EDBEYC	Tasty Wooden Towels	GDFXNXYW	Temperature	Discover the snake-like agility of our Pants, perfect for beneficial users	539936de-be77-4c84-94ca-7d47fbb3eb56	AVAILABLE	\N	2025-07-19 06:29:25.443	2025-07-19 06:29:25.443
J7ROXWODS5	Gorgeous Marble Tuna	7V2AAIC0	Vibration	The sleek and hateful Chicken comes with fuchsia LED lighting for smart functionality	ea93b5cf-a4f2-468f-85fc-3c57e0fbb99a	AVAILABLE	\N	2025-07-19 06:29:25.446	2025-07-19 06:29:25.446
CNJAQNFQ49	Bespoke Marble Shirt	0V2UWJUK	None	Stylish Chicken designed to make you stand out with innocent looks	7622ff60-636e-487f-9c37-d4e1b8afdcb4	AVAILABLE	\N	2025-07-19 06:29:25.448	2025-07-19 06:29:25.448
VSS7INV5GZ	Recycled Cotton Chicken	WKBJPRIE	Temperature	Professional-grade Computer perfect for vivid training and recreational use	660fd5e4-3f8f-41a6-90f1-9f8dbe728842	AVAILABLE	\N	2025-07-19 06:29:25.451	2025-07-19 06:29:25.451
Z4W1C9A9IK	Modern Rubber Fish	I4U118ML	Vibration	Savor the delicious essence in our Chicken, designed for wavy culinary adventures	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:25.453	2025-07-19 06:29:25.453
2GYZVLYELZ	Luxurious Bronze Shoes	K15FSNMB	Pressure	Ergonomic Mouse made with Silk for all-day carefree support	3a803e6a-4a78-4c2f-9a37-ca8e11b12ab3	AVAILABLE	\N	2025-07-19 06:29:25.456	2025-07-19 06:29:25.456
AG7AHBAR9Z	Intelligent Aluminum Pants	RXMLLVUK	None	Our moist-inspired Salad brings a taste of luxury to your odd lifestyle	5c7c6737-f829-4197-9ad0-7d3934769671	AVAILABLE	\N	2025-07-19 06:29:25.459	2025-07-19 06:29:25.459
SMG9ZKKWNK	Elegant Gold Table	II45WMZE	Vibration	Savor the spicy essence in our Pizza, designed for glossy culinary adventures	c3b2b7c3-b062-4964-a956-41e5a9be0f4a	AVAILABLE	\N	2025-07-19 06:29:25.461	2025-07-19 06:29:25.461
KDGENPQ4AW	Generic Plastic Pants	AEKXOKXR	Temperature	The Public-key optimizing access Shoes offers reliable performance and zesty design	91daed9d-f215-4f02-889b-78394905cebe	AVAILABLE	\N	2025-07-19 06:29:25.464	2025-07-19 06:29:25.464
2K1OSGMIQI	Generic Bamboo Soap	GCVUJT3L	Temperature	New Bacon model with 85 GB RAM, 546 GB storage, and familiar features	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:25.466	2025-07-19 06:29:25.466
9QBYRGXERK	Rustic Rubber Chair	OWLSJXGP	Temperature	Weimann and Sons's most advanced Sausages technology increases ragged capabilities	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:25.469	2025-07-19 06:29:25.469
QPO6D5MDSL	Awesome Bronze Soap	ODHUKCEZ	Vibration	The black Chips combines Cayman Islands aesthetics with Iodine-based durability	629ed9be-15cc-4a22-8b82-0f027805b60c	AVAILABLE	\N	2025-07-19 06:29:25.471	2025-07-19 06:29:25.471
ZFOERQWZZO	Small Granite Ball	DOBXJHOA	Vibration	Discover the hungry new Pizza with an exciting mix of Plastic ingredients	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:25.476	2025-07-19 06:29:25.476
TWHU0UB1CY	Fantastic Steel Bike	TXX9LLS4	Temperature	The sleek and flawless Shirt comes with grey LED lighting for smart functionality	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:25.482	2025-07-19 06:29:25.482
HK84MSELEZ	Luxurious Metal Gloves	HS4QXC98	Pressure	Schaden LLC's most advanced Cheese technology increases rigid capabilities	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:25.487	2025-07-19 06:29:25.487
ZQ7TRJ5TPG	Unbranded Bronze Mouse	HPY3PKUC	Vibration	Featuring Francium-enhanced technology, our Bacon offers unparalleled muted performance	27b8f481-d8eb-45e0-b467-584b0f762e7f	AVAILABLE	\N	2025-07-19 06:29:25.49	2025-07-19 06:29:25.49
M40L53SRMZ	Handcrafted Cotton Gloves	I2L8XLHP	Pressure	New Gloves model with 55 GB RAM, 720 GB storage, and hateful features	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:25.493	2025-07-19 06:29:25.493
OWFU0MDXJF	Fantastic Concrete Cheese	KP93AMT2	Vibration	Generic Pizza designed with Aluminum for grimy performance	5027d968-6a10-428e-9e71-265a49548124	AVAILABLE	\N	2025-07-19 06:29:25.496	2025-07-19 06:29:25.496
FOZTVXYEBW	Intelligent Granite Chips	7DPLLPBD	Temperature	Savor the smoky essence in our Pants, designed for ugly culinary adventures	9bb6d7b2-6ce5-4eda-b027-54ad5f9b5748	AVAILABLE	\N	2025-07-19 06:29:25.498	2025-07-19 06:29:25.498
ILM9IVJIGG	Incredible Ceramic Keyboard	PHEC0ANX	Vibration	Our parrot-friendly Pants ensures peppery comfort for your pets	a2c2aa8f-37d3-4c8d-b7ac-90c5bcc320d8	AVAILABLE	\N	2025-07-19 06:29:25.5	2025-07-19 06:29:25.5
WA0VSPHTZC	Intelligent Plastic Mouse	RILFJWZI	Vibration	The Immersive maximized emulation Computer offers reliable performance and blind design	5ac34043-94f7-439c-b245-05a94cbd7939	AVAILABLE	\N	2025-07-19 06:29:25.503	2025-07-19 06:29:25.503
JII07SCUHE	Practical Rubber Shoes	VDHXMDEE	Vibration	Ergonomic Ball made with Plastic for all-day ashamed support	44a549f1-09c9-4591-ad39-3c676a5c2331	AVAILABLE	\N	2025-07-19 06:29:25.505	2025-07-19 06:29:25.505
92BCGK7BNI	Sleek Steel Tuna	TWKR3TAD	Pressure	New green Car with ergonomic design for plump comfort	750c013e-376a-4a36-96a6-d3742cb5b48a	AVAILABLE	\N	2025-07-19 06:29:25.508	2025-07-19 06:29:25.508
ZMK4WDNUUB	Elegant Granite Fish	TLEZPJXL	Pressure	Discover the surprised new Pants with an exciting mix of Gold ingredients	fedfbd72-8ad0-4eba-aa80-bf4ff5b035a0	AVAILABLE	\N	2025-07-19 06:29:25.51	2025-07-19 06:29:25.51
GFZCZA6HZQ	Handmade Marble Fish	PZJAHCKE	Humidity	The purple Cheese combines Kuwait aesthetics with Moscovium-based durability	b7ab53de-8620-4966-af52-7bd8b6626da6	AVAILABLE	\N	2025-07-19 06:29:25.513	2025-07-19 06:29:25.513
47YQTJWPW9	Generic Plastic Hat	RCAEHSQK	Humidity	Our sea lion-friendly Bike ensures glum comfort for your pets	cad13380-5afa-4e75-8d58-46f57f70abcf	AVAILABLE	\N	2025-07-19 06:29:25.515	2025-07-19 06:29:25.515
O0YYIYLK0L	Recycled Concrete Keyboard	LQ99XAIF	None	New black Car with ergonomic design for nimble comfort	2a0956bf-3fee-4fe7-9d5d-eaedbf9a09dc	AVAILABLE	\N	2025-07-19 06:29:25.518	2025-07-19 06:29:25.518
GWG7BFNSQ2	Intelligent Concrete Chicken	D91P9XUH	Vibration	Green - Koss's most advanced Salad technology increases strong capabilities	fe9a8b9c-5c0b-4aa4-af19-c2fef249e9be	AVAILABLE	\N	2025-07-19 06:29:25.52	2025-07-19 06:29:25.52
QOQEXLQTRR	Fantastic Cotton Chair	Q47LDAOV	Humidity	New lavender Shoes with ergonomic design for our comfort	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:25.523	2025-07-19 06:29:25.523
COKAWSAKRP	Electronic Aluminum Sausages	OTJ0LH2H	Pressure	Innovative Shoes featuring reckless technology and Aluminum construction	0b96fa96-4b6b-4f8b-a15d-3d49a70ca565	AVAILABLE	\N	2025-07-19 06:29:25.53	2025-07-19 06:29:25.53
AJRHRW6EOZ	Rustic Marble Chips	H78SJIHM	None	The Osvaldo Soap is the latest in a series of indolent products from Runolfsdottir, Kunze and Kozey	e7dce8a5-0edb-42a9-8d27-807783ae3882	AVAILABLE	\N	2025-07-19 06:29:25.534	2025-07-19 06:29:25.534
LNX3ROQBDE	Refined Metal Towels	ZCPZ0FSL	Temperature	Savor the creamy essence in our Soap, designed for qualified culinary adventures	84c5139d-a39f-4835-a2cf-a8e4a2023c65	AVAILABLE	\N	2025-07-19 06:29:25.538	2025-07-19 06:29:25.538
B3OHRBGGA1	Licensed Rubber Mouse	9K5FNKWQ	None	Introducing the Albania-inspired Computer, blending shameless style with local craftsmanship	53be4ff2-3c64-4521-b389-ce12f8973cdf	AVAILABLE	\N	2025-07-19 06:29:25.542	2025-07-19 06:29:25.542
V9H6JQJZBE	Unbranded Bronze Ball	IQ2S1RR7	None	The grey Keyboard combines Puerto Rico aesthetics with Dysprosium-based durability	4b33dbc2-d67d-4d79-aee7-b3cdb5f0ab61	AVAILABLE	\N	2025-07-19 06:29:25.544	2025-07-19 06:29:25.544
EIGYKNBARW	Sleek Ceramic Gloves	EZW3BYDA	Temperature	Our rhinoceros-friendly Sausages ensures shameful comfort for your pets	5b1c263b-2692-481f-b203-3f576e5599c3	AVAILABLE	\N	2025-07-19 06:29:25.547	2025-07-19 06:29:25.547
YDYBCB4NJI	Frozen Steel Tuna	VQEK4CCO	Vibration	Oriental Bike designed with Bronze for digital performance	c43a5e8e-5c7e-41cd-a32b-7cc9c48a6d60	AVAILABLE	\N	2025-07-19 06:29:25.549	2025-07-19 06:29:25.549
0SETAAAOJA	Intelligent Concrete Salad	JSKKQPEB	Temperature	Stylish Computer designed to make you stand out with far-off looks	b57aed4c-9d39-47a7-982b-5b80b1b05cda	AVAILABLE	\N	2025-07-19 06:29:25.551	2025-07-19 06:29:25.551
KSBIB6BHXV	Practical Silk Mouse	DTLX3CDO	Temperature	Schaefer, Mraz and Little's most advanced Chair technology increases speedy capabilities	f54e4a56-7c29-4d58-bdfd-23001d9b14cf	AVAILABLE	\N	2025-07-19 06:29:25.554	2025-07-19 06:29:25.554
FRUQ0PHDRF	Practical Cotton Keyboard	SIGSFGQC	None	Our dog-friendly Tuna ensures tinted comfort for your pets	016e52aa-936d-40e5-8ed8-6986eb7b94d2	AVAILABLE	\N	2025-07-19 06:29:25.556	2025-07-19 06:29:25.556
NBAV7C1CNW	Refined Wooden Tuna	7JT5VPLG	Temperature	The green Car combines Myanmar aesthetics with Barium-based durability	97f532a5-3cce-42cb-82bb-01856aa3dc2d	AVAILABLE	\N	2025-07-19 06:29:25.559	2025-07-19 06:29:25.559
VIOJASO6US	Tasty Aluminum Bacon	HOC7VXTI	Temperature	Featuring Beryllium-enhanced technology, our Fish offers unparalleled monumental performance	90c3c103-fc83-49a3-a48e-f1d18c1f6b40	AVAILABLE	\N	2025-07-19 06:29:25.561	2025-07-19 06:29:25.561
UHGV41M0EN	Luxurious Plastic Cheese	XIWLLQVO	None	Savor the crispy essence in our Tuna, designed for reasonable culinary adventures	c165911b-9faa-4be9-8488-819df5754e8f	AVAILABLE	\N	2025-07-19 06:29:25.564	2025-07-19 06:29:25.564
NCZDQ5SRQQ	Bespoke Aluminum Chips	NYFJSM5L	Pressure	Experience the yellow brilliance of our Shoes, perfect for stupendous environments	11c7abc6-4793-4d64-b186-a8ce58be79a5	AVAILABLE	\N	2025-07-19 06:29:24.47	2025-07-19 06:36:06.656
VAKXGNHFIG	Awesome Cotton Cheese	Q5VKS4WH	Humidity	Gorgeous Chips designed with Plastic for sore performance	1cea7c08-fb2d-482d-a108-447cfdd4ba7a	AVAILABLE	\N	2025-07-19 06:29:25.326	2025-07-19 06:56:33.503
HKQCIIJTWU	Awesome Concrete Table	FBNPYDW3	Temperature	Handcrafted Gloves designed with Steel for total performance	71ff3cf3-745b-439e-84c7-22d5a38ab14b	AVAILABLE	\N	2025-07-19 06:29:24.252	2025-07-19 11:31:56.902
QBSW5IHVUY	Awesome Cotton Soap	XDSLAHQA	Temperature	Experience the gold brilliance of our Mouse, perfect for ironclad environments	7c8c9c8a-9ac4-44ba-9041-ec9aa4eefa95	AVAILABLE	\N	2025-07-19 06:29:24.493	2025-07-19 12:32:26.595
5ZHSDBCGUJ	Awesome Ceramic Car	KMBFHQD0	Pressure	Professional-grade Chips perfect for infatuated training and recreational use	97f532a5-3cce-42cb-82bb-01856aa3dc2d	RENTED	\N	2025-07-19 06:29:24.041	2025-07-19 12:34:16.849
NZXLK2IUMQ	Licensed Aluminum Tuna	ABNGD3V3	Temperature	Savor the zesty essence in our Pants, designed for assured culinary adventures	4f915d76-f32d-4744-a63e-9f8abbca15e8	AVAILABLE	\N	2025-07-19 06:29:23.011	2025-07-23 05:53:13.205
\.


--
-- Data for Name: ItemHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ItemHistory" (id, "itemSerial", action, details, "relatedId", "startDate", "endDate", "createdAt") FROM stdin;
9a9b9e60-9c09-42e6-b312-d124490b6a25	NCZDQ5SRQQ	CALIBRATED	Kalibrasi selesai dengan nomor sertifikat: 1/CAL-PBI/VII/2025	caea7610-514b-4f41-b348-406e107f774a	2025-07-19 06:35:44.529	2025-07-19 06:36:06.67	2025-07-19 06:35:44.531
5613df0b-f642-441a-9268-cfacca44f0c1	VAKXGNHFIG	CALIBRATED	Kalibrasi selesai dengan nomor sertifikat: 2/CAL-PBI/VII/2025	8bb28dab-0159-4fe5-8ec0-d1c2a08dda30	2025-07-19 06:56:16.08	2025-07-19 06:56:33.51	2025-07-19 06:56:16.081
56cd2fe5-8854-442c-84dc-7be9c31e176d	HKQCIIJTWU	MAINTAINED	Maintenance selesai: uy (oleh admin). CSR No: 1/CSR-PBI/VII/2025, TCR No: 1/TCR-PBI/VII/2025	181191a2-10f8-4579-aeeb-d3febca55690	2025-07-19 09:48:17.284	2025-07-19 11:31:56.914	2025-07-19 09:48:17.286
ec9ed5e5-d553-4f99-bf42-ed44fbfd2667	QBSW5IHVUY	MAINTAINED	Maintenance selesai: asd (oleh admin). CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	e0091aca-01b8-42f6-8f98-7229a5aa9715	2025-07-19 12:06:19.119	2025-07-19 12:32:26.625	2025-07-19 12:06:19.121
2bf95553-1d0c-424f-a30e-0c8a8a7ee58d	NZXLK2IUMQ	CALIBRATED	Kalibrasi selesai dengan nomor sertifikat: 3/CAL-PBI/VII/2025	c03209bf-7eae-457e-bd05-7407983e69c0	2025-07-23 05:51:06.705	2025-07-23 05:53:13.221	2025-07-23 05:51:06.708
\.


--
-- Data for Name: Maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Maintenance" (id, "itemSerial", "userId", status, "startDate", "endDate", "createdAt", "updatedAt") FROM stdin;
181191a2-10f8-4579-aeeb-d3febca55690	HKQCIIJTWU	7362c3dc-c889-41b3-ac13-9cffd518985d	COMPLETED	2025-07-19 09:48:17.262	2025-07-19 11:31:56.818	2025-07-19 09:48:17.265	2025-07-19 11:31:56.819
e0091aca-01b8-42f6-8f98-7229a5aa9715	QBSW5IHVUY	7362c3dc-c889-41b3-ac13-9cffd518985d	COMPLETED	2025-07-19 12:06:19.108	2025-07-19 12:32:26.554	2025-07-19 12:06:19.109	2025-07-19 12:32:26.556
\.


--
-- Data for Name: MaintenanceStatusLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MaintenanceStatusLog" (id, "maintenanceId", status, notes, "userId", "createdAt") FROM stdin;
68ca5bf7-0647-435e-84e4-8f66a0afd32a	181191a2-10f8-4579-aeeb-d3febca55690	PENDING	Maintenance dimulai oleh admin	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 09:48:17.277
db9985d3-1a6d-4094-8d66-e0601c1fecaa	181191a2-10f8-4579-aeeb-d3febca55690	COMPLETED	Maintenance selesai (oleh admin). CSR No: 1/CSR-PBI/VII/2025, TCR No: 1/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 11:31:56.906
26c529b7-d5a5-4130-92b3-ed95f1d126e9	e0091aca-01b8-42f6-8f98-7229a5aa9715	PENDING	Maintenance dimulai oleh admin	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 12:06:19.114
6914fb9f-a3cd-4bde-82e1-08a68230353e	e0091aca-01b8-42f6-8f98-7229a5aa9715	COMPLETED	Maintenance selesai (oleh admin). CSR No: 2/CSR-PBI/VII/2025, TCR No: 2/TCR-PBI/VII/2025	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 12:32:26.614
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, title, message, "isRead", "readAt", "shouldPlaySound", "reminderId", "userId", "createdAt") FROM stdin;
e058dca1-e573-4b98-b994-c1c2d2a6257e	⚠️ Jadwal: baba - Terlambat 1 hari	baba terlambat 1 hari. Segera lakukan pemeriksaan inventaris sesuai jadwal.	f	\N	t	faa24737-861c-4223-a9fb-bf237707d1a2	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 05:37:52.765
30c5cb29-1c02-43c4-9239-8643a63c83fc	⚠️ Jadwal: Testing - Terlambat 1 hari	Testing terlambat 1 hari. Segera lakukan pemeriksaan inventaris sesuai jadwal.	f	\N	t	7d791f8a-1dba-4182-80f4-6e386961a834	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 05:37:53.357
00cab906-ae57-436d-94cd-a246b276245e	⚠️ Jadwal: halo aku rudy - Terlambat 1 hari	halo aku rudy terlambat 1 hari. Segera lakukan pemeriksaan inventaris sesuai jadwal.	f	\N	t	48de3ea7-88e4-43f7-bdf7-a32a06c43dd3	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 05:37:53.826
839e0d40-ef60-4a0a-ad19-ce56e95e49e7	⚠️ Jadwal: tes - Terlambat 1 hari	tes terlambat 1 hari. Segera lakukan pemeriksaan inventaris sesuai jadwal.	f	\N	t	c3704aad-c3d2-4811-ab7e-9242d3e07f41	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 05:47:16.024
c1d6c1d1-a06c-43b1-9028-a5228a110b1d	Jadwal Pemeriksaan Hari Ini: beranak pinak	Pemeriksaan inventaris "beranak pinak" dijadwalkan untuk hari ini.	f	\N	t	3ce14a36-d2ae-4617-be71-912ab2183d78	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 06:09:13.826
\.


--
-- Data for Name: Reminder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Reminder" (id, type, status, title, message, "dueDate", "reminderDate", "itemSerial", "calibrationId", "rentalId", "scheduleId", "emailSent", "emailSentAt", "userId", "createdAt", "updatedAt", "maintenanceId", "acknowledgedAt") FROM stdin;
2f66b073-00e6-4e3e-bc74-4d0c9d1d1e07	SCHEDULE	ACKNOWLEDGED	Jadwal Pemeriksaan Hari Ini: kolo	Pemeriksaan inventaris "kolo" dijadwalkan untuk hari ini.	2025-07-22 00:00:00	2025-07-22 00:00:00	\N	\N	\N	00406b7f-72f8-4738-b720-1a67d79fdaec	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 09:39:20.43	2025-07-22 11:11:08.711	\N	2025-07-22 11:11:08.709
67c81d02-44a2-4091-9f6e-6646571f0512	SCHEDULE	PENDING	Jadwal Pemeriksaan Hari Ini: sss	Pemeriksaan inventaris "sss" dijadwalkan untuk hari ini.	2025-07-31 00:00:00	2025-07-31 00:00:00	\N	\N	\N	e5748ab1-06d3-406b-bbfa-ea28e72d6f57	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 09:02:30.643	2025-07-22 09:02:30.643	\N	\N
761f9a34-65b1-4e39-93ce-3cb4fc5a9a1f	CALIBRATION	PENDING	Kalibrasi Akan Segera Berakhir: Licensed Aluminum Tuna	Kalibrasi untuk Licensed Aluminum Tuna (SN: NZXLK2IUMQ) akan berakhir pada 22 Jul 2026.	2026-07-22 00:00:00	2026-06-22 00:00:00	NZXLK2IUMQ	c03209bf-7eae-457e-bd05-7407983e69c0	\N	\N	t	2025-07-23 05:53:45.371	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-23 05:53:13.133	2025-07-23 05:53:45.728	\N	\N
412cd648-9528-4442-9743-569ad0efad43	SCHEDULE	ACKNOWLEDGED	Jadwal Pemeriksaan Hari Ini: sipsss	Pemeriksaan inventaris "sipsss" dijadwalkan untuk hari ini.	2025-07-22 00:00:00	2025-07-22 00:00:00	\N	\N	\N	b46b41a8-1a76-42ee-9d8d-d006eb169286	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 11:41:29.525	2025-07-22 18:00:23.042	\N	2025-07-22 18:00:23.04
232ae998-f8e2-4345-825a-cc9a11d9faa2	SCHEDULE	ACKNOWLEDGED	Jadwal Pemeriksaan Hari Ini: testing semoga amin	Pemeriksaan inventaris "testing semoga amin" dijadwalkan untuk hari ini.	2025-07-22 00:00:00	2025-07-22 00:00:00	\N	\N	\N	60936ac1-4aac-4ce9-aa1f-9f3b89e12384	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 12:03:53.82	2025-07-22 18:00:23.629	\N	2025-07-22 18:00:23.628
7d791f8a-1dba-4182-80f4-6e386961a834	SCHEDULE	SENT	Jadwal Pemeriksaan Hari Ini: Testing	Pemeriksaan inventaris "Testing" dijadwalkan untuk hari ini.	2025-07-23 00:00:00	2025-07-23 00:00:00	\N	\N	\N	7dab9253-b56c-489e-8555-a5aa1dfdf797	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:17:34.217	2025-07-24 16:45:54.818	\N	\N
48de3ea7-88e4-43f7-bdf7-a32a06c43dd3	SCHEDULE	SENT	Jadwal Pemeriksaan Hari Ini: halo aku rudy	Pemeriksaan inventaris "halo aku rudy" dijadwalkan untuk hari ini.	2025-07-23 00:00:00	2025-07-23 00:00:00	\N	\N	\N	e868a1be-82a2-4d88-8c8d-0d7a1088e99a	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:01:04.225	2025-07-24 16:45:54.828	\N	\N
0c0ceebb-7ad0-49d9-ba90-ffd998ccf098	SCHEDULE	ACKNOWLEDGED	Jadwal Pemeriksaan Hari Ini: testing semoga bisa aamiin	Pemeriksaan inventaris "testing semoga bisa aamiin" dijadwalkan untuk hari ini.	2025-07-22 00:00:00	2025-07-22 00:00:00	\N	\N	\N	cab4fa49-8208-4be1-9793-79d1b880778f	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 11:19:21.398	2025-07-22 11:41:15.532	\N	2025-07-22 11:41:15.518
c3704aad-c3d2-4811-ab7e-9242d3e07f41	SCHEDULE	SENT	Jadwal Pemeriksaan Hari Ini: tes	Pemeriksaan inventaris "tes" dijadwalkan untuk hari ini.	2025-07-23 00:00:00	2025-07-23 00:00:00	\N	\N	\N	6de00d74-0884-45d0-9234-8dfe32bac83d	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-23 05:44:18.466	2025-07-24 16:45:54.84	\N	\N
faa24737-861c-4223-a9fb-bf237707d1a2	SCHEDULE	SENT	Jadwal Pemeriksaan Hari Ini: baba	Pemeriksaan inventaris "baba" dijadwalkan untuk hari ini.	2025-07-23 00:00:00	2025-07-23 00:00:00	\N	\N	\N	e566db49-7c19-43e4-b1f8-3a54161d2611	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-22 18:09:41.42	2025-07-24 16:45:54.85	\N	\N
3ce14a36-d2ae-4617-be71-912ab2183d78	SCHEDULE	SENT	Jadwal Pemeriksaan Hari Ini: beranak pinak	Pemeriksaan inventaris "beranak pinak" dijadwalkan untuk hari ini.	2025-07-24 00:00:00	2025-07-24 00:00:00	\N	\N	\N	73023022-3ff8-4a1c-b109-6a01e2bc4e9a	f	\N	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-24 06:09:13.816	2025-07-24 16:45:54.859	\N	\N
\.


--
-- Data for Name: Rental; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Rental" (id, "itemSerial", "userId", "poNumber", "doNumber", status, "startDate", "endDate", "returnDate", "createdAt", "updatedAt", "renterName", "renterPhone", "renterAddress", "initialCondition", "returnCondition", "customerId") FROM stdin;
457b804e-7c86-452d-9d83-4d752c23d988	5ZHSDBCGUJ	7362c3dc-c889-41b3-ac13-9cffd518985d	sda22	212s	APPROVED	2025-07-19 00:00:00	2025-07-31 00:00:00	\N	2025-07-19 12:34:16.816	2025-07-19 12:34:16.816	Adams Inc	947.659.6578 x3586	272 Collins Union	baik	\N	db6c0c3a-15b0-4017-a924-af68a549410c
\.


--
-- Data for Name: RentalStatusLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RentalStatusLog" (id, "rentalId", status, notes, "userId", "createdAt") FROM stdin;
3edafc5b-806c-475c-8067-a9431876e81b	457b804e-7c86-452d-9d83-4d752c23d988	APPROVED	Rental created and approved by admin	7362c3dc-c889-41b3-ac13-9cffd518985d	2025-07-19 12:34:16.836
\.


--
-- Data for Name: ServiceReport; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ServiceReport" (id, "maintenanceId", "reportNumber", customer, location, brand, model, "serialNumber", "dateIn", "reasonForReturn", findings, action, "sensorCO", "sensorH2S", "sensorO2", "sensorLEL", "lampClean", "lampReplace", "pumpTested", "pumpRebuilt", "pumpReplaced", "pumpClean", "instrumentCalibrate", "instrumentUpgrade", "instrumentCharge", "instrumentClean", "instrumentSensorAssembly", "createdAt", "updatedAt") FROM stdin;
5db7a53f-4814-4027-97b1-dc77a5c266cb	181191a2-10f8-4579-aeeb-d3febca55690	1/CSR-PBI/VII/2025	zoa	wok wok	rae	yy	HKQCIIJTWU	2025-07-19 00:00:00	yu	uy	yu	f	f	f	f	f	f	f	f	f	f	f	f	f	f	f	2025-07-19 11:31:56.858	2025-07-19 11:31:56.858
1caf1837-befe-4909-aabc-d56f42100d2e	e0091aca-01b8-42f6-8f98-7229a5aa9715	2/CSR-PBI/VII/2025	sad	asd	sad	sda	QBSW5IHVUY	2025-07-19 00:00:00	sad	asd	sad	f	f	f	f	f	f	f	f	f	f	f	f	f	f	f	2025-07-19 12:32:26.561	2025-07-19 12:32:26.561
\.


--
-- Data for Name: ServiceReportPart; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ServiceReportPart" (id, "serviceReportId", "itemNumber", description, "snPnOld", "snPnNew", "createdAt") FROM stdin;
f6778553-7bb4-4307-bed8-66f9115645b5	5db7a53f-4814-4027-97b1-dc77a5c266cb	1	123	niu7	uuy	2025-07-19 11:31:56.876
a9b43889-1a86-4b07-b09c-068f515b1b0a	1caf1837-befe-4909-aabc-d56f42100d2e	1	sad	sad	sda	2025-07-19 12:32:26.568
\.


--
-- Data for Name: TechnicalReport; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TechnicalReport" (id, "maintenanceId", "csrNumber", "deliveryTo", "quoNumber", "dateReport", "techSupport", "dateIn", "estimateWork", "reasonForReturn", findings, action, "beforePhotoUrl", "afterPhotoUrl", "termsConditions", "createdAt", "updatedAt") FROM stdin;
098bfed0-0a06-4ce9-af76-172ebbfc3ccf	181191a2-10f8-4579-aeeb-d3febca55690	1/TCR-PBI/VII/2025	op	\N	2025-07-19 00:00:00	yuuy	2025-07-31 00:00:00	hjh	hhh	ui	\N	/uploads/062b42e6-e4cf-4e4f-8ed0-16b6ec7551b6.jpg	/uploads/48104318-dfa1-4400-bbab-3522be3d09d5.jpg	\N	2025-07-19 11:31:56.886	2025-07-19 11:31:56.886
8990df9e-6627-4623-b099-e73cab7cc78b	e0091aca-01b8-42f6-8f98-7229a5aa9715	2/TCR-PBI/VII/2025	sda	\N	2025-07-31 00:00:00	sad	2025-07-19 00:00:00	sad	sda	asd	\N	/uploads/9c5a8ee2-474b-4386-babb-649228ec70a4.jpg	/uploads/040fed28-8128-48c5-810e-25009fff863b.jpg	\N	2025-07-19 12:32:26.58	2025-07-19 12:32:26.58
\.


--
-- Data for Name: TechnicalReportPart; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TechnicalReportPart" (id, "technicalReportId", "itemNumber", "namaUnit", description, quantity, "unitPrice", "totalPrice", "createdAt") FROM stdin;
fc53d390-aa9d-4be6-9fa3-d977fb04132d	098bfed0-0a06-4ce9-af76-172ebbfc3ccf	1	6ty	h	1	\N	\N	2025-07-19 11:31:56.895
63562913-bcd9-4642-856d-31ee68f93e89	8990df9e-6627-4623-b099-e73cab7cc78b	1	dsa	sda	1	\N	\N	2025-07-19 12:32:26.59
\.


--
-- Data for Name: TestResultEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TestResultEntry" (id, "certificateId", "testSensor", "testSpan", "testResult", "createdAt", "updatedAt") FROM stdin;
d8a73050-18b8-4d13-9848-df3007c343cf	0a0890b0-ecab-4ef1-9281-9159c77b9882	ss	s	Pass	2025-07-19 13:36:06.649	2025-07-19 13:36:06.649
498a1151-7ba5-4b05-971f-f70e543dea52	a901482c-0738-4972-a009-9e61c142ccc9	123	123	Pass	2025-07-19 13:56:33.496	2025-07-19 13:56:33.496
d4ba60a7-576e-423f-8b58-d4193094f90b	2f718e8a-2d3e-43ec-8e7e-e2af3f7b73c0	ok	ok	Pass	2025-07-23 12:53:13.188	2025-07-23 12:53:13.188
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, password, role, "createdAt", "updatedAt") FROM stdin;
46a2e4d4-3a0f-47eb-8d42-05e5c100d05e	User Paramata	user@paramata.com	$2b$10$QNXkzF9KU59rEzZ4R0GX2OANpjRk62VfFCrCGDcmv9sgOLKBk8tzi	USER	2025-07-19 06:29:22.06	2025-07-19 06:29:22.06
7362c3dc-c889-41b3-ac13-9cffd518985d	Admin Paramata	admin@paramata.com	$2b$10$5pD8MzwQCs2nPBzhrYdJnuSnroed1Qhk2V1x7eFWDXtIdX180jprm	ADMIN	2025-07-19 06:29:22.078	2025-07-19 06:29:22.078
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
0065ab05-3316-4d59-b6b9-42ad09959410	8d099111d6400672be556306907f4842ac5ef41fd212dffaa9c9fd71ff1e2bb1	2025-07-19 12:28:19.070314+07	20250714100843_update_activity_types	\N	\N	2025-07-19 12:28:18.674828+07	1
85ffad81-5e6d-408d-ac78-3cadfe56de6b	2c741674a711eadcc4dc2c9dcd791b120d5c044c548bfb7bec3eb8c79abe61c5	2025-07-19 12:29:35.587617+07	20250719052933_add_should_play_sound_to_notifications	\N	\N	2025-07-19 12:29:35.449801+07	1
ec7c0ab8-de89-46e3-8cf6-6f4d3199dab9	18496e144239bf11b68c7785487d4491fc542af1adcf0a71a79d2e615d79eca7	2025-07-19 16:33:42.166957+07	20250719093340_add_maintenance_reminder_type	\N	\N	2025-07-19 16:33:42.122733+07	1
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: CalibrationCertificate CalibrationCertificate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalibrationCertificate"
    ADD CONSTRAINT "CalibrationCertificate_pkey" PRIMARY KEY (id);


--
-- Name: CalibrationStatusLog CalibrationStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalibrationStatusLog"
    ADD CONSTRAINT "CalibrationStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: Calibration Calibration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Calibration"
    ADD CONSTRAINT "Calibration_pkey" PRIMARY KEY (id);


--
-- Name: CustomerHistory CustomerHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomerHistory"
    ADD CONSTRAINT "CustomerHistory_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: GasCalibrationEntry GasCalibrationEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GasCalibrationEntry"
    ADD CONSTRAINT "GasCalibrationEntry_pkey" PRIMARY KEY (id);


--
-- Name: InventoryCheckExecutionItem InventoryCheckExecutionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckExecutionItem"
    ADD CONSTRAINT "InventoryCheckExecutionItem_pkey" PRIMARY KEY (id);


--
-- Name: InventoryCheckExecution InventoryCheckExecution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckExecution"
    ADD CONSTRAINT "InventoryCheckExecution_pkey" PRIMARY KEY (id);


--
-- Name: InventoryCheckItem InventoryCheckItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckItem"
    ADD CONSTRAINT "InventoryCheckItem_pkey" PRIMARY KEY (id);


--
-- Name: InventoryCheck InventoryCheck_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheck"
    ADD CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY (id);


--
-- Name: ItemHistory ItemHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemHistory"
    ADD CONSTRAINT "ItemHistory_pkey" PRIMARY KEY (id);


--
-- Name: Item Item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_pkey" PRIMARY KEY ("serialNumber");


--
-- Name: MaintenanceStatusLog MaintenanceStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MaintenanceStatusLog"
    ADD CONSTRAINT "MaintenanceStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: Maintenance Maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Maintenance"
    ADD CONSTRAINT "Maintenance_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Reminder Reminder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY (id);


--
-- Name: RentalStatusLog RentalStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RentalStatusLog"
    ADD CONSTRAINT "RentalStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: Rental Rental_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rental"
    ADD CONSTRAINT "Rental_pkey" PRIMARY KEY (id);


--
-- Name: ServiceReportPart ServiceReportPart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceReportPart"
    ADD CONSTRAINT "ServiceReportPart_pkey" PRIMARY KEY (id);


--
-- Name: ServiceReport ServiceReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceReport"
    ADD CONSTRAINT "ServiceReport_pkey" PRIMARY KEY (id);


--
-- Name: TechnicalReportPart TechnicalReportPart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TechnicalReportPart"
    ADD CONSTRAINT "TechnicalReportPart_pkey" PRIMARY KEY (id);


--
-- Name: TechnicalReport TechnicalReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TechnicalReport"
    ADD CONSTRAINT "TechnicalReport_pkey" PRIMARY KEY (id);


--
-- Name: TestResultEntry TestResultEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResultEntry"
    ADD CONSTRAINT "TestResultEntry_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: CalibrationCertificate_calibrationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CalibrationCertificate_calibrationId_key" ON public."CalibrationCertificate" USING btree ("calibrationId");


--
-- Name: ServiceReport_maintenanceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ServiceReport_maintenanceId_key" ON public."ServiceReport" USING btree ("maintenanceId");


--
-- Name: TechnicalReport_maintenanceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TechnicalReport_maintenanceId_key" ON public."TechnicalReport" USING btree ("maintenanceId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ActivityLog ActivityLog_affectedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_calibrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES public."Calibration"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."Maintenance"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_rentalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES public."Rental"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalibrationCertificate CalibrationCertificate_calibrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalibrationCertificate"
    ADD CONSTRAINT "CalibrationCertificate_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES public."Calibration"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CalibrationStatusLog CalibrationStatusLog_calibrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalibrationStatusLog"
    ADD CONSTRAINT "CalibrationStatusLog_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES public."Calibration"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalibrationStatusLog CalibrationStatusLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CalibrationStatusLog"
    ADD CONSTRAINT "CalibrationStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Calibration Calibration_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Calibration"
    ADD CONSTRAINT "Calibration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Calibration Calibration_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Calibration"
    ADD CONSTRAINT "Calibration_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Calibration Calibration_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Calibration"
    ADD CONSTRAINT "Calibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GasCalibrationEntry GasCalibrationEntry_certificateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GasCalibrationEntry"
    ADD CONSTRAINT "GasCalibrationEntry_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES public."CalibrationCertificate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryCheckExecutionItem InventoryCheckExecutionItem_executionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckExecutionItem"
    ADD CONSTRAINT "InventoryCheckExecutionItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES public."InventoryCheckExecution"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryCheckItem InventoryCheckItem_checkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckItem"
    ADD CONSTRAINT "InventoryCheckItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES public."InventoryCheck"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryCheckItem InventoryCheckItem_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheckItem"
    ADD CONSTRAINT "InventoryCheckItem_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryCheck InventoryCheck_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCheck"
    ADD CONSTRAINT "InventoryCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ItemHistory ItemHistory_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemHistory"
    ADD CONSTRAINT "ItemHistory_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Item Item_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MaintenanceStatusLog MaintenanceStatusLog_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MaintenanceStatusLog"
    ADD CONSTRAINT "MaintenanceStatusLog_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."Maintenance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaintenanceStatusLog MaintenanceStatusLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MaintenanceStatusLog"
    ADD CONSTRAINT "MaintenanceStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Maintenance Maintenance_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Maintenance"
    ADD CONSTRAINT "Maintenance_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Maintenance Maintenance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Maintenance"
    ADD CONSTRAINT "Maintenance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_reminderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES public."Reminder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reminder Reminder_calibrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES public."Calibration"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."Maintenance"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_rentalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES public."Rental"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."InventoryCheck"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RentalStatusLog RentalStatusLog_rentalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RentalStatusLog"
    ADD CONSTRAINT "RentalStatusLog_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES public."Rental"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RentalStatusLog RentalStatusLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RentalStatusLog"
    ADD CONSTRAINT "RentalStatusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rental Rental_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rental"
    ADD CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Rental Rental_itemSerial_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rental"
    ADD CONSTRAINT "Rental_itemSerial_fkey" FOREIGN KEY ("itemSerial") REFERENCES public."Item"("serialNumber") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rental Rental_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Rental"
    ADD CONSTRAINT "Rental_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceReportPart ServiceReportPart_serviceReportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceReportPart"
    ADD CONSTRAINT "ServiceReportPart_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES public."ServiceReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceReport ServiceReport_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ServiceReport"
    ADD CONSTRAINT "ServiceReport_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."Maintenance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TechnicalReportPart TechnicalReportPart_technicalReportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TechnicalReportPart"
    ADD CONSTRAINT "TechnicalReportPart_technicalReportId_fkey" FOREIGN KEY ("technicalReportId") REFERENCES public."TechnicalReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TechnicalReport TechnicalReport_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TechnicalReport"
    ADD CONSTRAINT "TechnicalReport_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."Maintenance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestResultEntry TestResultEntry_certificateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TestResultEntry"
    ADD CONSTRAINT "TestResultEntry_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES public."CalibrationCertificate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

