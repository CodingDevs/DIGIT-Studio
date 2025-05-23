const express = require("express");
const router = express.Router();
const config = require("../config");
const { getPublicServiceApplicationDetails, create_pdf, getBaseMDMSData } = require("../api");
const { asyncMiddleware } = require("../utils/asyncMiddleware");
const { logger } = require("../logger");

/**
 * Helper to render a standardized error response
 */
function renderError(res, message, status = 500) {
  res.status(status).send({ errorMessage: message });
}

/**
 * Endpoint: POST /generate
 * Description: Generates a PDF for a given service application
 * Query Params:
 *  - tenantId (string, required)
 *  - applicationNumber (string, required)
 *  - pdfKey (string, required)
 *  - serviceCode (string, optional)
 * Body:
 *  - RequestInfo (object, required)
 */
router.post(
  "/pdf",
  asyncMiddleware(async (req, res) => {
    const { tenantId, applicationNumber, pdfKey, serviceCode } = req.query;
    const requestInfo = req.body;

    // Basic validations for required parameters
    if (!requestInfo) return renderError(res, "requestInfo cannot be null", 400);
    if (!tenantId) return renderError(res, "tenantId is mandatory to generate the receipt", 400);
    if (!applicationNumber) return renderError(res, "applicationNumber is mandatory to generate the receipt", 400);
    if (!pdfKey) return renderError(res, "pdfKey is mandatory to generate the receipt", 400);

    try {
      let applicationDetails, mdmsData;

      // Fetch application details and base MDMS data
      try {
        applicationDetails = await getPublicServiceApplicationDetails(tenantId, serviceCode, applicationNumber);
        mdmsData = await getBaseMDMSData(tenantId);
      } catch (err) {
        logger.error(`Error fetching details for application ${applicationNumber} with service ${serviceCode}`);
        logger.error(err);
        return renderError(res, "Failed to query details of the application", 500);
      }

      const application = applicationDetails?.Application;

      // Proceed only if application exists
      if (application?.length > 0) {
        try {
          logger.info(`Generating PDF with key ${pdfKey} for application ${applicationNumber}`);

          const PDFGenerateObject= {
            PublicService: [
              {
                ...applicationDetails,
                ...mdmsData,
              },
            ],
          }
          logger.info(`PDFGenerateObject data: ${JSON.stringify(PDFGenerateObject)}`);

          // Call PDF generation service
          const pdfResponse = await create_pdf(
            tenantId,
            pdfKey,
            PDFGenerateObject,
            requestInfo
          );

          // Send the PDF as downloadable response
          const filename = `${pdfKey}_${Date.now()}`;
          res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=${filename}.pdf`,
          });
          pdfResponse.data.pipe(res);
        } catch (err) {
          logger.error("Error generating PDF", err);
          return renderError(res, "Failed to generate PDF for application", 500);
        }
      } else {
        // No matching application found
        return renderError(res, "No application found for the given applicationNumber", 404);
      }
    } catch (err) {
      logger.error("Unexpected error during PDF generation", err);
      return renderError(res, "Something went wrong", 500);
    }
  })
);

module.exports = router;
