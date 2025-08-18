# Public Service - Design Document

## Overview
The Public Service is a microservice that manages public services and applications within the DIGIT ecosystem. It provides APIs for creating, updating, and searching services and applications, with workflow integration.

## Service Architecture Diagram

```mermaid
graph TB
    subgraph "External Clients"
        UI[Web UI/Mobile App]
        API[API Gateway]
    end

    subgraph "Public Service"
        subgraph "Controllers"
            PC[PublicController]
            AC[ApplicationController]
        end
        
        subgraph "Services"
            PS[PublicService]
            AS[ApplicationService]
            ES[EnrichmentService]
            WI[WorkflowIntegrator]
            IS[IndividualService]
            BS[BillingService]
            MS[MDMSService]
            M2S[MDMSV2Service]
            IGS[IdGenService]
            SMS[SMSService]
            VS[ValidationService]
            INS[IndexerService]
            CS[ChecklistService]
        end
        
        subgraph "Repositories"
            PR[PublicRepository]
            AR[ApplicationRepository]
            RR[RestCallRepository]
        end
        
        subgraph "Kafka"
            KP[KafkaProducer]
            KC[KafkaConsumer]
        end
    end

    subgraph "External Services"
        WF[Workflow Service]
        IND[Individual Service]
        BILL[Billing Service]
        MDMS[MDMS Service]
        IDGEN[ID Generation Service]
        LOC[Localization Service]
        HEALTH[Health Service]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        KAFKA[Kafka Cluster]
    end

    UI --> API
    API --> PC
    API --> AC
    
    PC --> PS
    AC --> AS
    
    PS --> PR
    AS --> AR
    AS --> ES
    AS --> WI
    
    ES --> IS
    ES --> BS
    ES --> MS
    ES --> M2S
    ES --> IGS
    ES --> SMS
    
    CS --> M2S
    CS --> HEALTH
    
    PR --> PG
    AR --> PG
    PR --> KP
    AR --> KP
    
    KC --> AS
    KC --> WI
    
    IS --> IND
    BS --> BILL
    MS --> MDMS
    M2S --> MDMS
    IGS --> IDGEN
    SMS --> LOC
    WI --> WF
    
    KP --> KAFKA
    KC --> KAFKA
```

## API Endpoints and Flow

### Service Management APIs

#### 1. Create Service
**Endpoint:** `POST /public-service/v1/service`

```mermaid
sequenceDiagram
    participant Client
    participant PC as PublicController
    participant ES as EnrichmentService
    participant VS as ValidationService
    participant PS as PublicService
    participant PR as PublicRepository
    participant KP as KafkaProducer
    participant PG as PostgreSQL

    Client->>PC: POST /service
    PC->>ES: EnrichServiceWithIdGen()
    ES->>IDGEN: Generate Service ID
    IDGEN-->>ES: Service ID
    ES-->>PC: Enriched Request
    PC->>VS: Validate()
    VS-->>PC: Validation Result
    PC->>PS: CreateService()
    PS->>PR: CreateService()
    PR->>KP: Push to SAVE_PUBLIC_SERVICE topic
    KP->>KAFKA: Publish Message
    PR-->>PS: Response
    PS-->>PC: Service Response
    PC-->>Client: HTTP 200 + Service Data
```

#### 2. Search Service
**Endpoint:** `GET /public-service/v1/service`

```mermaid
sequenceDiagram
    participant Client
    participant PC as PublicController
    participant PS as PublicService
    participant PR as PublicRepository
    participant PG as PostgreSQL

    Client->>PC: GET /service?params
    PC->>PS: SearchService(criteria)
    PS->>PR: SearchService(criteria)
    PR->>PG: SELECT query with filters
    PG-->>PR: Service records
    PR-->>PS: Service list
    PS-->>PC: Service Response
    PC-->>Client: HTTP 200 + Services
```

#### 3. Update Service
**Endpoint:** `PUT /public-service/v1/service/{serviceCode}`

```mermaid
sequenceDiagram
    participant Client
    participant PC as PublicController
    participant PS as PublicService
    participant PR as PublicRepository
    participant KP as KafkaProducer

    Client->>PC: PUT /service/{code}
    PC->>PS: UpdateService()
    PS->>PR: UpdateService()
    PR->>KP: Push to UPDATE_PUBLIC_SERVICE topic
    KP->>KAFKA: Publish Message
    PR-->>PS: Response
    PS-->>PC: Service Response
    PC-->>Client: HTTP 200 + Updated Service
```

### Application Management APIs

#### 1. Create Application
**Endpoint:** `POST /public-service/v1/application/{serviceCode}`

```mermaid
sequenceDiagram
    participant Client
    participant AC as ApplicationController
    participant ES as EnrichmentService
    participant IS as IndividualService
    participant WI as WorkflowIntegrator
    participant AS as ApplicationService
    participant AR as ApplicationRepository
    participant SMS as SMSService
    participant INS as IndexerService
    participant KP as KafkaProducer

    Client->>AC: POST /application/{serviceCode}
    AC->>ES: EnrichApplicationsWithIdGen()
    ES->>IDGEN: Generate Application ID
    IDGEN-->>ES: Application ID
    ES-->>AC: Enriched Request
    
    loop For each applicant
        AC->>IS: GetIndividual() / CreateUser()
        IS->>IND: Individual Service API
        IND-->>IS: Individual Data
        IS-->>AC: Individual ID
    end
    
    AC->>WI: CallWorkflow()
    WI->>WF: Workflow Service API
    WF-->>WI: Workflow Response
    WI-->>AC: Success
    
    AC->>AS: CreateApplication()
    AS->>AR: CreateUsingKafka()
    AR->>KP: Push to SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC
    AR->>KP: Push to SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER
    KP->>KAFKA: Publish Messages
    AR-->>AS: Response
    AS-->>AC: Application Response
    
    AC->>SMS: SendSMS()
    SMS->>LOC: Get localized messages
    LOC-->>SMS: Messages
    SMS->>KP: Push to SEND_SMS_TOPIC
    KP->>KAFKA: SMS Message
    
    AC->>INS: SendRequestToIndexerForParallelWorkflow()
    INS->>KP: Push to Indexer Topic
    KP->>KAFKA: Indexer Message
    
    AC-->>Client: HTTP 200 + Application Data
```

#### 2. Search Application
**Endpoint:** `GET /public-service/v1/application/{serviceCode}`

```mermaid
sequenceDiagram
    participant Client
    participant AC as ApplicationController
    participant AS as ApplicationService
    participant AR as ApplicationRepository
    participant ES as EnrichmentService
    participant PG as PostgreSQL

    Client->>AC: GET /application/{serviceCode}?params
    AC->>AS: SearchApplication(criteria)
    AS->>AR: SearchWithIndividual(criteria)
    AR->>PG: Complex JOIN query (application, reference, applicant, documents)
    PG-->>AR: Application records with related data
    AR-->>AS: Search Response
    AS->>ES: EnrichApplicationsWithIndividuals()
    ES->>IND: Individual Service API
    IND-->>ES: Individual Details
    ES-->>AS: Enriched Applications
    AS-->>AC: Search Response
    AC-->>Client: HTTP 200 + Applications
```

#### 3. Update Application
**Endpoint:** `PUT /public-service/v1/application/{serviceCode}`

```mermaid
sequenceDiagram
    participant Client
    participant AC as ApplicationController
    participant ES as EnrichmentService
    participant WI as WorkflowIntegrator
    participant AS as ApplicationService
    participant AR as ApplicationRepository
    participant SMS as SMSService
    participant INS as IndexerService
    participant KP as KafkaProducer

    Client->>AC: PUT /application/{serviceCode}
    AC->>ES: EnrichApplicationsWithDemand()
    ES->>BILL: Billing Service API
    BILL-->>ES: Demand Details
    ES-->>AC: Enriched Request
    
    AC->>WI: CallWorkflow()
    WI->>WF: Workflow Service API
    WF-->>WI: Workflow Response
    WI-->>AC: Success
    
    AC->>AS: UpdateApplication()
    AS->>AR: UpdateUsingKafka()
    AR->>KP: Push to UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC
    AR->>KP: Push to UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER
    KP->>KAFKA: Publish Messages
    AR-->>AS: Response
    AS-->>AC: Application Response
    
    AC->>SMS: SendSMS()
    AC->>INS: SendRequestToIndexerForParallelWorkflow()
    
    AC-->>Client: HTTP 200 + Updated Application
```

## Database Schema

### Core Tables

```sql
-- Service Table
CREATE TABLE service (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR NOT NULL,
    module VARCHAR NOT NULL,
    business_service VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    service_code VARCHAR UNIQUE NOT NULL,
    additional_details JSONB,
    createdby UUID NOT NULL,
    last_modifiedby UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Application Table
CREATE TABLE application (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR NOT NULL,
    module VARCHAR NOT NULL,
    business_service VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    channel VARCHAR,
    application_number VARCHAR UNIQUE NOT NULL,
    workflow_status VARCHAR,
    service_code VARCHAR NOT NULL,
    service_details JSONB,
    additional_details JSONB,
    address JSONB,
    workflow JSONB,
    createdby UUID NOT NULL,
    last_modifiedby UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (service_code) REFERENCES service(service_code)
);

-- Reference Table
CREATE TABLE reference (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL,
    reference_type VARCHAR,
    module VARCHAR,
    tenant_id VARCHAR,
    reference_no VARCHAR,
    active BOOLEAN DEFAULT true,
    FOREIGN KEY (application_id) REFERENCES application(id)
);

-- Applicant Table
CREATE TABLE applicant (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL,
    type VARCHAR NOT NULL,
    user_id VARCHAR,
    active BOOLEAN DEFAULT true,
    FOREIGN KEY (application_id) REFERENCES application(id)
);

-- Application Document Table
CREATE TABLE application_document (
    id UUID PRIMARY KEY,
    application_number VARCHAR NOT NULL,
    document_type VARCHAR,
    file_store_id VARCHAR,
    document_uid VARCHAR,
    additional_details JSONB,
    createdby UUID NOT NULL,
    last_modifiedby UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Kafka Topics and Message Flow

### Producer Topics

```mermaid
graph LR
    subgraph "Service Operations"
        PS[PublicService] --> SAVE_PS[save-public-service]
        PS --> UPDATE_PS[update-public-service]
    end
    
    subgraph "Application Operations"
        AS[ApplicationService] --> SAVE_APP[save-public-service-application]
        AS --> UPDATE_APP[update-public-service-application]
        AS --> SAVE_IDX[save-public-service-application-indexer]
        AS --> UPDATE_IDX[update-public-service-application-indexer]
    end
    
    subgraph "Notifications"
        SMS[SMSService] --> SMS_TOPIC[egov.core.notification.sms]
        SMS --> EMAIL_TOPIC[egov.core.notification.email]
    end
    
    subgraph "Process Management"
        PS --> PROCESS[save-public-service-process]
    end
```

### Consumer Topics

```mermaid
graph LR
    subgraph "Payment Processing"
        PAYMENT[egov.collection.payment-create] --> PC[PaymentConsumer]
        PC --> WI[WorkflowIntegrator]
        PC --> AS[ApplicationService]
    end
```

### Message Structures

#### Service Message
```json
{
  "RequestInfo": {
    "apiId": "string",
    "ver": "string",
    "ts": "timestamp",
    "action": "string",
    "did": "string",
    "key": "string",
    "msgId": "string",
    "authToken": "string",
    "userInfo": {
      "id": "string",
      "uuid": "uuid",
      "userName": "string",
      "name": "string",
      "mobileNumber": "string",
      "emailId": "string",
      "locale": "string",
      "type": "string",
      "roles": []
    }
  },
  "Service": {
    "id": "uuid",
    "tenantId": "string",
    "module": "string",
    "businessService": "string",
    "status": "string",
    "serviceCode": "string",
    "additionalDetails": {},
    "auditDetails": {
      "createdBy": "uuid",
      "lastModifiedBy": "uuid",
      "createdTime": "timestamp",
      "lastModifiedTime": "timestamp"
    }
  }
}
```

#### Application Message
```json
{
  "RequestInfo": { /* Same as above */ },
  "Application": {
    "id": "uuid",
    "tenantId": "string",
    "module": "string",
    "businessService": "string",
    "status": "string",
    "channel": "string",
    "applicationNumber": "string",
    "workflowStatus": "string",
    "serviceCode": "string",
    "serviceDetails": {},
    "additionalDetails": {},
    "address": {
      "id": "uuid",
      "tenantId": "string",
      "doorNo": "string",
      "plotNo": "string",
      "landmark": "string",
      "city": "string",
      "district": "string",
      "region": "string",
      "state": "string",
      "country": "string",
      "pincode": "string",
      "additionalDetails": {},
      "buildingName": "string",
      "street": "string",
      "locality": {
        "code": "string",
        "name": "string",
        "label": "string",
        "latitude": "number",
        "longitude": "number",
        "children": []
      }
    },
    "workflow": {
      "id": "uuid",
      "action": "string",
      "assignes": [],
      "comments": "string",
      "varificationDocuments": []
    },
    "auditDetails": { /* Same as above */ },
    "applicants": [
      {
        "id": "uuid",
        "type": "string",
        "userId": "string",
        "active": "boolean"
      }
    ],
    "documents": [
      {
        "id": "string",
        "documentType": "string",
        "fileStoreId": "string",
        "documentUid": "string",
        "additionalDetails": {},
        "auditDetails": { /* Same as above */ }
      }
    ],
    "reference": [
      {
        "id": "uuid",
        "referenceType": "string",
        "module": "string",
        "tenantId": "string",
        "referenceNo": "string",
        "active": "boolean"
      }
    ]
  }
}
```

## External Service Integration

### Service Dependencies

```mermaid
graph TB
    subgraph "Public Service Dependencies"
        PS[Public Service]
        
        PS --> WF[Workflow Service<br/>localhost:8081]
        PS --> IND[Individual Service<br/>localhost:8082]
        PS --> BILL[Billing Service<br/>localhost:8083]
        PS --> IDGEN[ID Generation Service<br/>localhost:8084]
        PS --> LOC[Localization Service<br/>localhost:8085]
        PS --> MDMS[MDMS Service<br/>localhost:8094]
        PS --> HEALTH[Health Service<br/>localhost:8082]
    end
    
    subgraph "Service Calls"
        WF --> |POST| WF_TRANS[/egov-workflow-v2/egov-wf/process/_transition]
        WF --> |POST| WF_SEARCH[/egov-workflow-v2/egov-wf/process/_search]
        WF --> |POST| WF_BS_CREATE[/egov-workflow-v2/egov-wf/businessservice/_create]
        
        IND --> |POST| IND_CREATE[/health-individual/v1/_create]
        IND --> |POST| IND_SEARCH[/health-individual/v1/_search]
        
        BILL --> |POST| DEMAND_CREATE[/billing-service/demand/_create]
        BILL --> |POST| BILL_FETCH[/billing-service/bill/v2/_fetchbill]
        
        IDGEN --> |POST| ID_GEN[/egov-idgen/id/_generate]
        
        LOC --> |POST| LOC_SEARCH[/localization/messages/v1/_search]
        
        MDMS --> |POST| MDMS_SEARCH[/egov-mdms-service/v1/_search]
        MDMS --> |POST| MDMS_V2[/egov-mdms-service/v2]
        
        HEALTH --> |POST| HEALTH_DEF[/health-service-request/service/definition/v1/_*]
    end
```

### ChecklistService Integration

```mermaid
sequenceDiagram
    participant CS as ChecklistService
    participant M2S as MDMSV2Service
    participant HEALTH as HealthService

    CS->>M2S: SearchMDMS(schemaCode, filters)
    M2S->>MDMS: MDMS V2 API Call
    MDMS-->>M2S: Checklist Data
    M2S-->>CS: Checklist Response
    
    loop For each checklist item
        CS->>M2S: SearchMDMS("Studio.Checklists", subFilters)
        M2S-->>CS: Sub-checklist Data
        
        loop For each state
            CS->>HEALTH: CheckIfChecklistExists(checklistCode)
            HEALTH-->>CS: Exists/Not Exists
            
            alt If exists
                CS->>HEALTH: UpdateChecklist(payload)
            else
                CS->>HEALTH: CreateChecklist(payload)
            end
            HEALTH-->>CS: Success/Error
        end
    end
```

## Environment Configuration

### Key Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SERVER_PORT` | HTTP server port | `8080` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `public_service_db` |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka brokers | `localhost:9092` |
| `WORKFLOW_HOST` | Workflow service URL | `http://localhost:8081/` |
| `INDIVIDUAL_SERVICE_HOST` | Individual service URL | `http://localhost:8082/` |
| `BILLING_SERVICE_HOST` | Billing service URL | `http://localhost:8083/` |
| `MDMS_SERVICE_HOST` | MDMS service URL | `http://localhost:8094/` |
| `FLYWAY_ENABLED` | Enable DB migrations | `true/false` |
| `KAFKA_PAYMENT_CONSUMER_ENABLED` | Enable payment consumer | `true/false` |

### Kafka Topic Configuration

| Topic | Purpose | Producer | Consumer |
|-------|---------|----------|----------|
| `save-public-service` | Service creation | PublicRepository | External Persister |
| `update-public-service` | Service updates | PublicRepository | External Persister |
| `save-public-service-application` | Application creation | ApplicationRepository | External Persister |
| `update-public-service-application` | Application updates | ApplicationRepository | External Persister |
| `save-public-service-application-indexer` | Indexing new applications | ApplicationRepository | External Indexer |
| `update-public-service-application-indexer` | Indexing updated applications | ApplicationRepository | External Indexer |
| `egov.collection.payment-create` | Payment notifications | External Payment Service | PaymentConsumer |
| `egov.core.notification.sms` | SMS notifications | SMSService | External SMS Service |
| `egov.core.notification.email` | Email notifications | SMSService | External Email Service |

## Error Handling and Logging

### Error Response Format
```json
{
  "Errors": [
    {
      "code": "ERROR_CODE",
      "message": "Error description",
      "description": "Detailed error information"
    }
  ]
}
```

### Logging Strategy
- All service calls are logged with request/response details
- Database operations include query logging
- Kafka message publishing/consumption is logged
- Error scenarios are logged with stack traces
- Performance metrics are logged for monitoring

## Security Considerations

### Authentication & Authorization
- All APIs require `X-Tenant-Id` header
- Some APIs require `auth-token` header
- User context is maintained through RequestInfo
- Role-based access control through UserInfo

### Data Validation
- Input validation at controller level
- Schema validation through MDMS integration
- Business rule validation through ValidationService
- SQL injection prevention through parameterized queries

## Performance Optimizations

### Database Optimizations
- Indexed columns: `tenant_id`, `service_code`, `application_number`
- Connection pooling for database connections
- Prepared statements for repeated queries

### Caching Strategy
- MDMS data caching in MDMSV2Service
- Individual service response caching
- Localization message caching

### Asynchronous Processing
- Kafka-based asynchronous processing for heavy operations
- Non-blocking I/O for external service calls
- Background processing for notifications and indexing

This design document provides a comprehensive overview of the Public Service architecture, showing all service interactions, database operations, Kafka topics, and external service integrations.