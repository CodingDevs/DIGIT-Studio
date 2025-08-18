# Public Service - API Flow Diagrams

## Service Management APIs

### 1. Create Service - POST /public-service/v1/service

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Headers}
    B -->|Missing X-Tenant-Id| C[Return 400 Error]
    B -->|Valid| D[Decode JSON Request]
    D -->|Invalid JSON| E[Return 400 Error]
    D -->|Valid| F[Set TenantId if empty]
    F --> G[EnrichmentService.EnrichServiceWithIdGen]
    
    G --> H[Call ID Generation Service]
    H --> I{ID Gen Success?}
    I -->|No| J[Return 500 Error]
    I -->|Yes| K[ValidationService.Validate]
    
    K --> L{Validation Success?}
    L -->|No| M[Return 500 Error]
    L -->|Yes| N[PublicService.CreateService]
    
    N --> O[PublicRepository.CreateService]
    O --> P[Check if service exists]
    P -->|Exists| Q[Return Error: Service already exists]
    P -->|Not Exists| R[Generate UUIDs and Audit Details]
    
    R --> S[Marshal request to JSON]
    S --> T{Kafka Producer Available?}
    T -->|No| U[Return Error: Kafka not initialized]
    T -->|Yes| V[Push to SAVE_PUBLIC_SERVICE topic]
    
    V --> W{Kafka Push Success?}
    W -->|No| X[Return Kafka Error]
    W -->|Yes| Y[Return Success Response with Service Data]
    
    style A fill:#e1f5fe
    style Y fill:#c8e6c9
    style C,E,J,M,Q,U,X fill:#ffcdd2
```

### 2. Search Service - GET /public-service/v1/service

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Headers}
    B -->|Missing X-Tenant-Id| C[Return 400 Error]
    B -->|Missing auth-token| D[Return 400 Error]
    B -->|Valid| E[Extract Query Parameters]
    
    E --> F[Build SearchCriteria]
    F --> G[Set tenantId, module, businessService, serviceCode]
    G --> H[PublicService.SearchService]
    
    H --> I[PublicRepository.SearchService]
    I --> J[Build Dynamic SQL Query]
    J --> K[Add WHERE conditions based on criteria]
    
    K --> L[Execute Database Query]
    L --> M{Query Success?}
    M -->|No| N[Return Database Error]
    M -->|Yes| O[Process Result Rows]
    
    O --> P[Create Service objects]
    P --> Q[Unmarshal JSON fields]
    Q --> R[Build ServiceResponse]
    R --> S[Return Success with Services List]
    
    style A fill:#e1f5fe
    style S fill:#c8e6c9
    style C,D,N fill:#ffcdd2
```

### 3. Update Service - PUT /public-service/v1/service/{serviceCode}

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Headers & Path}
    B -->|Missing X-Tenant-Id| C[Return 400 Error]
    B -->|Valid| D[Decode JSON Request]
    D -->|Invalid JSON| E[Return 400 Error]
    D -->|Valid| F[Set tenantId and serviceCode if empty]
    
    F --> G[PublicService.UpdateService]
    G --> H[PublicRepository.UpdateService]
    H --> I[Search for existing service]
    
    I --> J{Service Exists?}
    J -->|No| K[Return Error: No Service Found]
    J -->|Yes| L[Generate Audit Details]
    
    L --> M[Marshal request to JSON]
    M --> N{Kafka Producer Available?}
    N -->|No| O[Return Error: Kafka not initialized]
    N -->|Yes| P[Push to UPDATE_PUBLIC_SERVICE topic]
    
    P --> Q{Kafka Push Success?}
    Q -->|No| R[Return Kafka Error]
    Q -->|Yes| S[Return Success Response]
    
    style A fill:#e1f5fe
    style S fill:#c8e6c9
    style C,E,K,O,R fill:#ffcdd2
```

## Application Management APIs

### 4. Create Application - POST /public-service/v1/application/{serviceCode}

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Path & Headers}
    B -->|Missing serviceCode| C[Return 400 Error]
    B -->|Missing X-Tenant-Id| D[Return 400 Error]
    B -->|Valid| E[Decode JSON Request]
    E -->|Invalid JSON| F[Return 400 Error]
    E -->|Valid| G[Set tenantId and serviceCode]
    
    G --> H[MDMS Schema Validation]
    H --> I[ValidateServiceDetailsWithSchema]
    I -->|Validation Failed| J[Return 400 Error]
    I -->|Valid| K[EnrichmentService.EnrichApplicationsWithIdGen]
    
    K --> L[Call ID Generation Service]
    L --> M{ID Gen Success?}
    M -->|No| N[Return 400 Error]
    M -->|Yes| O[Search MDMS for Service Config]
    
    O --> P{MDMS Data Valid?}
    P -->|No| Q[Return 500 Error]
    P -->|Yes| R[Validate Applicant Types]
    
    R --> S{Valid Applicant Types?}
    S -->|No| T[Return 400 Error]
    S -->|Yes| U[Process Each Applicant]
    
    U --> V{Applicant Type = Individual?}
    V -->|No| W[Skip Individual Processing]
    V -->|Yes| X[Check if Individual Exists]
    
    X --> Y[IndividualService.GetIndividual]
    Y --> Z{Individual Exists?}
    Z -->|No| AA[IndividualService.CreateUser]
    Z -->|Yes| BB[Use Existing Individual ID]
    
    AA --> CC{User Creation Success?}
    CC -->|No| DD[Return 500 Error]
    CC -->|Yes| EE[Set UserId]
    BB --> EE
    W --> EE
    
    EE --> FF[WorkflowIntegrator.CallWorkflow]
    FF --> GG{Workflow Success?}
    GG -->|No| HH[Log Error, Continue]
    GG -->|Yes| II[ApplicationService.CreateApplication]
    HH --> II
    
    II --> JJ[ApplicationRepository.CreateUsingKafka]
    JJ --> KK[Validate Service Exists]
    KK -->|Service Not Found| LL[Return Error]
    KK -->|Valid| MM[Generate UUIDs and Audit Details]
    
    MM --> NN[Push to SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC]
    NN --> OO[Push to SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER]
    OO --> PP{Kafka Success?}
    PP -->|No| QQ[Return Kafka Error]
    PP -->|Yes| RR[SMSService.SendSMS]
    
    RR --> SS[Get Localized Messages]
    SS --> TT[Push to SEND_SMS_TOPIC]
    TT --> UU[IndexerService.SendRequestToIndexer]
    UU --> VV[Push to Indexer Topic]
    VV --> WW[Return Success Response]
    
    style A fill:#e1f5fe
    style WW fill:#c8e6c9
    style C,D,F,J,N,Q,T,DD,LL,QQ fill:#ffcdd2
```

### 5. Search Application - GET /public-service/v1/application/{serviceCode}

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Path & Headers}
    B -->|Missing serviceCode| C[Return 400 Error]
    B -->|Missing X-Tenant-Id| D[Return 400 Error]
    B -->|Missing auth-token| E[Return 400 Error]
    B -->|Valid| F[Extract Query Parameters]
    
    F --> G[Build SearchCriteria]
    G --> H[Set all search parameters]
    H --> I[ApplicationService.SearchApplication]
    
    I --> J[ApplicationRepository.SearchWithIndividual]
    J --> K{Service Code Provided?}
    K -->|Yes| L[Validate Service Exists]
    L -->|Service Not Found| M[Return Error]
    L -->|Valid| N[Build Complex JOIN Query]
    K -->|No| N
    
    N --> O[Execute Query with Filters]
    O --> P[application LEFT JOIN reference LEFT JOIN applicant LEFT JOIN application_document]
    P --> Q{Query Success?}
    Q -->|No| R[Return Database Error]
    Q -->|Yes| S[Process Result Rows]
    
    S --> T[Group by Application ID]
    T --> U[Build Application Objects with Relations]
    U --> V[EnrichmentService.EnrichApplicationsWithIndividuals]
    
    V --> W[Call Individual Service for each applicant]
    W --> X[Merge Individual Details]
    X --> Y[Return Search Response]
    
    style A fill:#e1f5fe
    style Y fill:#c8e6c9
    style C,D,E,M,R fill:#ffcdd2
```

### 6. Update Application - PUT /public-service/v1/application/{serviceCode}

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Path & Headers}
    B -->|Missing serviceCode| C[Return 400 Error]
    B -->|Missing X-Tenant-Id| D[Return 400 Error]
    B -->|Valid| E[Decode JSON Request]
    E -->|Invalid JSON| F[Return 400 Error]
    E -->|Valid| G[Set tenantId and serviceCode]
    
    G --> H[EnrichmentService.EnrichApplicationsWithDemand]
    H --> I[Call Billing Service]
    I --> J{Demand Creation Success?}
    J -->|No| K[Return 500 Error]
    J -->|Yes| L[WorkflowIntegrator.CallWorkflow]
    
    L --> M{Workflow Success?}
    M -->|No| N[Return 500 Error]
    M -->|Yes| O[ApplicationService.UpdateApplication]
    
    O --> P[ApplicationRepository.UpdateUsingKafka]
    P --> Q[Validate Application Exists]
    Q -->|Not Found| R[Return Error]
    Q -->|Valid| S[Generate Audit Details]
    
    S --> T[Push to UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC]
    T --> U[Push to UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER]
    U --> V{Kafka Success?}
    V -->|No| W[Return Kafka Error]
    V -->|Yes| X[SMSService.SendSMS]
    
    X --> Y[IndexerService.SendRequestToIndexer]
    Y --> Z[Return Success Response]
    
    style A fill:#e1f5fe
    style Z fill:#c8e6c9
    style C,D,F,K,N,R,W fill:#ffcdd2
```

### 7. Search My Applications - GET /public-service/v1/application

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Headers}
    B -->|Missing X-Tenant-Id| C[Return 400 Error]
    B -->|Missing auth-token| D[Return 400 Error]
    B -->|Valid| E[Extract Query Parameters]
    
    E --> F[Build SearchCriteria without serviceCode]
    F --> G[Set tenantId and other parameters]
    G --> H[ApplicationService.SearchApplication]
    
    H --> I[ApplicationRepository.SearchWithIndividual]
    I --> J[Build JOIN Query without service validation]
    J --> K[Execute Query with Filters]
    
    K --> L{Query Success?}
    L -->|No| M[Return Database Error]
    L -->|Yes| N[Process Result Rows]
    
    N --> O[Group by Application ID]
    O --> P[Build Application Objects]
    P --> Q[Return Search Response]
    
    style A fill:#e1f5fe
    style Q fill:#c8e6c9
    style C,D,M fill:#ffcdd2
```

### 8. Calculate - POST /public-service/_calculate

```mermaid
flowchart TD
    A[Client Request] --> B[Decode JSON Request]
    B -->|Invalid JSON| C[Return 400 Error]
    B -->|Valid| D[EnrichmentService.GetCalculation]
    
    D --> E[Call Billing Service for Calculation]
    E --> F{Calculation Success?}
    F -->|No| G[Return 500 Error]
    F -->|Yes| H[Return Calculation Response]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style C,G fill:#ffcdd2
```

### 9. Delete MDMS Schema - POST /public-service/_deleteMDMSSchema

```mermaid
flowchart TD
    A[Client Request] --> B{Validate Query Parameters}
    B -->|Missing schemaCode| C[Return 400 Error]
    B -->|Missing tenantId| D[Return 400 Error]
    B -->|Valid| E[ApplicationService.DeleteMDMSSchema]
    
    E --> F[ApplicationRepository.DeleteMDMSSchema]
    F --> G{Parameters Not Empty?}
    G -->|Empty| H[Return Error: Parameters required]
    G -->|Valid| I[Execute DELETE Query]
    
    I --> J[DELETE FROM eg_mdms_schema_definition WHERE code = ? AND tenantid = ?]
    J --> K{Delete Success?}
    K -->|No| L[Return Database Error]
    K -->|Yes| M[Log Success and Return]
    
    style A fill:#e1f5fe
    style M fill:#c8e6c9
    style C,D,H,L fill:#ffcdd2
```

## Kafka Consumer Flow

### Payment Consumer - egov.collection.payment-create

```mermaid
flowchart TD
    A[Kafka Message Received] --> B[Unmarshal Payment Request]
    B -->|Invalid JSON| C[Log Error, Continue]
    B -->|Valid| D{Payment Details Exist?}
    D -->|No| E[Log Warning, Continue]
    D -->|Yes| F[Extract ConsumerCode and BusinessService]
    
    F --> G{Valid Payment Detail?}
    G -->|No| H[Log Error, Continue]
    G -->|Yes| I[Build Search Criteria]
    
    I --> J[ApplicationService.SearchApplication]
    J --> K{Application Found?}
    K -->|No| L[Log Error, Continue]
    K -->|Yes| M[Search MDMS for Service Config]
    
    M --> N[Extract nextActionAfterPayment]
    N --> O{Next Action Available?}
    O -->|No| P[Log Warning, Skip Workflow]
    O -->|Yes| Q[Set Workflow Action]
    
    Q --> R[WorkflowIntegrator.CallWorkflow]
    R --> S{Workflow Success?}
    S -->|No| T[Log Error, Continue]
    S -->|Yes| U[ApplicationService.UpdateApplication]
    
    U --> V{Update Success?}
    V -->|No| W[Log Error, Continue]
    V -->|Yes| X[Log Success]
    
    X --> Y[Commit Kafka Message]
    P --> Y
    C --> Y
    E --> Y
    H --> Y
    L --> Y
    T --> Y
    W --> Y
    
    Y --> Z{Commit Success?}
    Z -->|No| AA[Log Commit Error]
    Z -->|Yes| BB[Continue to Next Message]
    
    style A fill:#e1f5fe
    style BB fill:#c8e6c9
    style C,E,H,L,T,W,AA fill:#ffcdd2
```

## ChecklistService Flow

### GetChecklist Method

```mermaid
flowchart TD
    A[GetChecklist Called] --> B[Build Schema Code: module.businessService]
    B --> C[Create Initial Filters]
    C --> D[MDMSV2Service.SearchMDMS]
    
    D --> E{MDMS Call Success?}
    E -->|No| F[Return Error]
    E -->|Yes| G[Extract checklist data]
    
    G --> H{Checklist Data Exists?}
    H -->|No| I[Return nil]
    H -->|Yes| J[Initialize Results Map]
    
    J --> K[Loop Through Each Checklist Item]
    K --> L{Valid Item with Name?}
    L -->|No| M[Continue to Next Item]
    L -->|Yes| N[Build Sub-filters]
    
    N --> O[MDMSV2Service.SearchMDMS for Studio.Checklists]
    O --> P{Sub-checklist Success?}
    P -->|No| Q[Return Error]
    P -->|Yes| R[Store in Results]
    
    R --> S[Extract States Array]
    S --> T{States Exist?}
    T -->|No| U[Continue to Next Item]
    T -->|Yes| V[Loop Through Each State]
    
    V --> W[Build Checklist Code: businessService.STATE.NAME]
    W --> X[CheckIfChecklistExists]
    X --> Y[Call Health Service Search API]
    Y --> Z{Checklist Exists?}
    Z -->|Yes| AA[UpdateChecklist]
    Z -->|No| BB[CreateChecklist]
    
    AA --> CC[Call Health Service Update API]
    BB --> DD[Call Health Service Create API]
    CC --> EE{API Success?}
    DD --> EE
    EE -->|No| FF[Return Error]
    EE -->|Yes| GG[Store in Results]
    
    GG --> HH{More States?}
    HH -->|Yes| V
    HH -->|No| II{More Items?}
    II -->|Yes| K
    II -->|No| JJ[Return Results Map]
    
    M --> II
    U --> II
    
    style A fill:#e1f5fe
    style JJ fill:#c8e6c9
    style F,Q,FF fill:#ffcdd2
```

## External Service Call Patterns

### MDMS Service Calls

```mermaid
flowchart LR
    A[Service] --> B[MDMSV2Service.SearchMDMS]
    B --> C[Build Request Payload]
    C --> D[POST /egov-mdms-service/v2]
    D --> E{Response Success?}
    E -->|No| F[Return Error]
    E -->|Yes| G[Parse Response]
    G --> H[Return MDMS Data]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style F fill:#ffcdd2
```

### Individual Service Calls

```mermaid
flowchart LR
    A[Service] --> B{Operation Type}
    B -->|Search| C[POST /health-individual/v1/_search]
    B -->|Create| D[POST /health-individual/v1/_create]
    C --> E{Response Success?}
    D --> E
    E -->|No| F[Return Error]
    E -->|Yes| G[Parse Individual Data]
    G --> H[Return Individual Response]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style F fill:#ffcdd2
```

### Workflow Service Calls

```mermaid
flowchart LR
    A[WorkflowIntegrator] --> B{Operation Type}
    B -->|Transition| C[POST /egov-workflow-v2/egov-wf/process/_transition]
    B -->|Search| D[POST /egov-workflow-v2/egov-wf/process/_search]
    C --> E{Response Success?}
    D --> E
    E -->|No| F[Log Error, Continue]
    E -->|Yes| G[Parse Workflow Data]
    G --> H[Update Application Workflow]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style F fill:#fff3e0
```

### ID Generation Service Calls

```mermaid
flowchart LR
    A[EnrichmentService] --> B[Build ID Request]
    B --> C[POST /egov-idgen/id/_generate]
    C --> D{Response Success?}
    D -->|No| E[Return Error]
    D -->|Yes| F[Extract Generated IDs]
    F --> G[Set IDs in Request]
    G --> H[Return Enriched Request]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style E fill:#ffcdd2
```

These flow diagrams show the complete request-response cycle for each API endpoint, including all validation steps, external service calls, database operations, and error handling paths.