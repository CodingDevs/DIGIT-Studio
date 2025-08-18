# Public Service - ASCII Flow Diagrams

## 1. Create Service API Flow

```
Client Request
      |
      v
┌─────────────────┐
│ Validate Headers│ ──── Missing X-Tenant-Id ──→ [400 Error]
└─────────────────┘
      |
      v
┌─────────────────┐
│ Decode JSON     │ ──── Invalid JSON ──→ [400 Error]
└─────────────────┘
      |
      v
┌─────────────────┐
│ ID Generation   │ ──── ID Gen Failed ──→ [500 Error]
│ Service Call    │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Validation      │ ──── Validation Failed ──→ [500 Error]
│ Service         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Check Service   │ ──── Service Exists ──→ [Error: Already Exists]
│ Exists          │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Kafka Producer  │ ──── Kafka Failed ──→ [Kafka Error]
│ Push Message    │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Success  │
│ Response        │
└─────────────────┘
```

## 2. Search Service API Flow

```
Client Request
      |
      v
┌─────────────────┐
│ Validate Headers│ ──── Missing Headers ──→ [400 Error]
└─────────────────┘
      |
      v
┌─────────────────┐
│ Extract Query   │
│ Parameters      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Build Dynamic   │
│ SQL Query       │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Execute Database│ ──── Query Failed ──→ [Database Error]
│ Query           │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Process Results │
│ & Build Response│
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Services │
│ List            │
└─────────────────┘
```

## 3. Create Application API Flow

```
Client Request
      |
      v
┌─────────────────┐
│ Validate Path & │ ──── Missing serviceCode/tenantId ──→ [400 Error]
│ Headers         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ MDMS Schema     │ ──── Validation Failed ──→ [400 Error]
│ Validation      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ ID Generation   │ ──── ID Gen Failed ──→ [400 Error]
│ Service         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ MDMS Service    │ ──── MDMS Failed ──→ [500 Error]
│ Config Search   │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Validate        │ ──── Invalid Types ──→ [400 Error]
│ Applicant Types │
└─────────────────┘
      |
      v
┌─────────────────┐    Individual Type?
│ Process Each    │ ──── Yes ──→ ┌─────────────────┐
│ Applicant       │              │ Individual      │
└─────────────────┘              │ Service Call    │
      |                          └─────────────────┘
      |                                    |
      |                          ┌─────────────────┐
      |                          │ Create/Get      │
      |                          │ Individual      │
      |                          └─────────────────┘
      |                                    |
      v                                    |
┌─────────────────┐ ←────────────────────────
│ Workflow        │
│ Integration     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Kafka Producer  │ ──── Kafka Failed ──→ [Kafka Error]
│ (2 Topics)      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ SMS Service     │
│ Notification    │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Indexer Service │
│ Call            │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Success  │
│ Response        │
└─────────────────┘
```

## 4. Search Application API Flow

```
Client Request
      |
      v
┌─────────────────┐
│ Validate Path & │ ──── Missing Required Headers ──→ [400 Error]
│ Headers         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Extract Query   │
│ Parameters      │
└─────────────────┘
      |
      v
┌─────────────────┐    Service Code Provided?
│ Service         │ ──── Yes ──→ ┌─────────────────┐
│ Validation      │              │ Validate Service│ ──── Not Found ──→ [Error]
└─────────────────┘              │ Exists          │
      |                          └─────────────────┘
      |                                    |
      v                                    |
┌─────────────────┐ ←────────────────────────
│ Complex JOIN    │
│ Query Execution │
└─────────────────┘
      |
      v
┌─────────────────┐
│ application     │
│ LEFT JOIN       │
│ reference       │
│ LEFT JOIN       │
│ applicant       │
│ LEFT JOIN       │
│ documents       │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Group Results   │
│ by Application  │
│ ID              │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Individual      │
│ Service         │
│ Enrichment      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Search   │
│ Response        │
└─────────────────┘
```

## 5. Update Application API Flow

```
Client Request
      |
      v
┌─────────────────┐
│ Validate Path & │ ──── Missing Required Fields ──→ [400 Error]
│ Headers         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Billing Service │ ──── Demand Creation Failed ──→ [500 Error]
│ Demand Creation │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Workflow        │ ──── Workflow Failed ──→ [500 Error]
│ Integration     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Validate        │ ──── Application Not Found ──→ [Error]
│ Application     │
│ Exists          │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Kafka Producer  │ ──── Kafka Failed ──→ [Kafka Error]
│ (2 Topics)      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ SMS Service     │
│ Notification    │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Indexer Service │
│ Call            │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Success  │
│ Response        │
└─────────────────┘
```

## 6. Payment Consumer Flow

```
Kafka Message Received
      |
      v
┌─────────────────┐
│ Unmarshal       │ ──── Invalid JSON ──→ [Log Error, Continue]
│ Payment Request │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Extract Payment │ ──── No Payment Details ──→ [Log Warning, Continue]
│ Details         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Search          │ ──── Application Not Found ──→ [Log Error, Continue]
│ Application     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ MDMS Service    │
│ Config Search   │
└─────────────────┘
      |
      v
┌─────────────────┐    Next Action Available?
│ Extract Next    │ ──── No ──→ [Log Warning, Skip Workflow]
│ Action After    │
│ Payment         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Workflow        │ ──── Workflow Failed ──→ [Log Error, Continue]
│ Integration     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Update          │ ──── Update Failed ──→ [Log Error, Continue]
│ Application     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Commit Kafka    │
│ Message         │
└─────────────────┘
```

## 7. ChecklistService Flow

```
GetChecklist Called
      |
      v
┌─────────────────┐
│ Build Schema    │
│ Code:           │
│ module.business │
└─────────────────┘
      |
      v
┌─────────────────┐
│ MDMS V2 Service │ ──── MDMS Failed ──→ [Return Error]
│ Search Call     │
└─────────────────┘
      |
      v
┌─────────────────┐    Checklist Data Exists?
│ Extract         │ ──── No ──→ [Return nil]
│ Checklist Data  │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Loop Through    │
│ Each Item       │
└─────────────────┘
      |
      v
┌─────────────────┐    Valid Item?
│ Validate Item   │ ──── No ──→ [Continue to Next]
│ with Name       │
└─────────────────┘
      |
      v
┌─────────────────┐
│ MDMS Search for │
│ Studio.         │
│ Checklists      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Extract States  │    States Exist?
│ Array           │ ──── No ──→ [Continue to Next Item]
└─────────────────┘
      |
      v
┌─────────────────┐
│ Loop Through    │
│ Each State      │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Build Checklist │
│ Code: business  │
│ Service.STATE.  │
│ NAME            │
└─────────────────┘
      |
      v
┌─────────────────┐    Checklist Exists?
│ Health Service  │ ──── Yes ──→ ┌─────────────────┐
│ Check Exists    │              │ Update          │
└─────────────────┘              │ Checklist       │
      |                          └─────────────────┘
      | No                                 |
      v                                    |
┌─────────────────┐                       |
│ Create          │                       |
│ Checklist       │                       |
└─────────────────┘                       |
      |                                    |
      v                                    |
┌─────────────────┐ ←────────────────────────
│ Store in        │
│ Results Map     │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return Results  │
│ Map             │
└─────────────────┘
```

## External Service Integration Patterns

### MDMS Service Pattern
```
Service Request
      |
      v
┌─────────────────┐
│ Build Request   │
│ Payload         │
└─────────────────┘
      |
      v
┌─────────────────┐
│ POST /egov-mdms-│
│ service/v2      │
└─────────────────┘
      |
      v
┌─────────────────┐    Success?
│ Parse Response  │ ──── No ──→ [Return Error]
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return MDMS     │
│ Data            │
└─────────────────┘
```

### Individual Service Pattern
```
Service Request
      |
      v
┌─────────────────┐    Operation Type?
│ Determine       │ ──── Search ──→ ┌─────────────────┐
│ Operation       │                 │ POST /health-   │
└─────────────────┘                 │ individual/v1/  │
      |                             │ _search         │
      | Create                      └─────────────────┘
      v                                       |
┌─────────────────┐                          |
│ POST /health-   │                          |
│ individual/v1/  │                          |
│ _create         │                          |
└─────────────────┘                          |
      |                                      |
      v                                      |
┌─────────────────┐ ←──────────────────────────
│ Parse Individual│
│ Response        │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Return          │
│ Individual Data │
└─────────────────┘
```

## Database Operations

### Service Table Operations
```
CREATE SERVICE:
┌─────────────────┐
│ Generate UUID   │
│ Set Audit Info  │
│ Push to Kafka   │
│ Topic: save-    │
│ public-service  │
└─────────────────┘

SEARCH SERVICE:
┌─────────────────┐
│ SELECT * FROM   │
│ service WHERE   │
│ tenant_id = ?   │
│ AND module = ?  │
│ AND ...         │
└─────────────────┘

UPDATE SERVICE:
┌─────────────────┐
│ Check Exists    │
│ Update Audit    │
│ Push to Kafka   │
│ Topic: update-  │
│ public-service  │
└─────────────────┘
```

### Application Table Operations
```
CREATE APPLICATION:
┌─────────────────┐
│ Generate UUIDs  │
│ for Application,│
│ Address,        │
│ Workflow,       │
│ References,     │
│ Applicants,     │
│ Documents       │
└─────────────────┘
      |
      v
┌─────────────────┐
│ Push to Kafka   │
│ Topics:         │
│ - save-app      │
│ - save-indexer  │
└─────────────────┘

SEARCH APPLICATION:
┌─────────────────┐
│ SELECT a.*, r.*,│
│ ap.*, ad.*      │
│ FROM application│
│ LEFT JOIN       │
│ reference r     │
│ LEFT JOIN       │
│ applicant ap    │
│ LEFT JOIN       │
│ app_document ad │
└─────────────────┘
```

## Kafka Topics Flow

```
PRODUCERS:
┌─────────────────┐    ┌─────────────────┐
│ Service Ops     │    │ Application Ops │
│                 │    │                 │
│ save-public-    │    │ save-public-    │
│ service         │    │ service-        │
│                 │    │ application     │
│ update-public-  │    │                 │
│ service         │    │ update-public-  │
└─────────────────┘    │ service-        │
                       │ application     │
┌─────────────────┐    │                 │
│ Notifications   │    │ save/update-    │
│                 │    │ indexer topics  │
│ egov.core.      │    └─────────────────┘
│ notification.   │
│ sms             │
│                 │
│ egov.core.      │
│ notification.   │
│ email           │
└─────────────────┘

CONSUMERS:
┌─────────────────┐
│ Payment         │
│ Processing      │
│                 │
│ egov.collection.│
│ payment-create  │
│                 │
│ ↓               │
│ PaymentConsumer │
│ ↓               │
│ Workflow Update │
│ ↓               │
│ App Update      │
└─────────────────┘
```