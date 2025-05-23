// config.js
// const env = process.env.NODE_ENV; // 'dev' or 'test'

HOST = process.env.EGOV_HOST || "localhost";


if (!HOST) {
  console.log("You need to set the HOST variable");
  process.exit(1);
}

module.exports = {
  auth_token: process.env.AUTH_TOKEN,
  KAFKA_BROKER_HOST: process.env.KAFKA_BROKER_HOST || "localhost:9092",
  KAFKA_RECEIVE_CREATE_JOB_TOPIC: process.env.KAFKA_RECEIVE_CREATE_JOB_TOPIC || "PDF_GEN_RECEIVE",
  KAFKA_BULK_PDF_TOPIC: process.env.KAFKA_BULK_PDF_TOPIC || "BULK_PDF_GEN",
  KAFKA_PAYMENT_EXCEL_GEN_TOPIC: process.env.KAFKA_PAYMENT_EXCEL_GEN_TOPIC || "PAYMENT_EXCEL_GEN",
  KAFKA_EXPENSE_PAYMENT_CREATE_TOPIC: process.env.KAFKA_EXPENSE_PAYMENT_CREATE_TOPIC || "expense-payment-create",
  PDF_BATCH_SIZE: process.env.PDF_BATCH_SIZE || 40,
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_NAME: process.env.DB_NAME || "digit-works",
  DB_PORT: process.env.DB_PORT || 5432,
  app: {
    port: parseInt(process.env.APP_PORT) || 8080,
    host: HOST,
    contextPath: process.env.CONTEXT_PATH || "/studio-pdf",
  },
  host: {
    mdms: process.env.EGOV_MDMS_HOST || 'https://unified-dev.digit.org',
    pdf: process.env.EGOV_PDF_HOST || 'http://localhost:8089',
    user: process.env.EGOV_USER_HOST || HOST,
    workflow: process.env.EGOV_WORKFLOW_HOST || HOST,
    localization: process.env.EGOV_LOCALIZATION_HOST || 'http://localhost:8088',
    filestore: process.env.EGOV_FILESTORE_SERVICE_HOST || 'http://localhost:8092',
    publicService: process.env.PUBLIC_SERVICE_HOST || 'https://unified-dev.digit.org'
  },
  paths: {
    pdf_create: "/pdf-service/v1/_createnosave",
    user_search: "/user/_search",
    mdms_search: "/egov-mdms-service/v1/_search",
    workflow_search: "/egov-workflow-v2/egov-wf/process/_search",
    mdms_get: "/egov-mdms-service/v1/_get",
    localization_search: "/localization/messages/v1/_search",
    publicService_search :"/public-service/v1/application"
  }
};
