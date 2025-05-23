var config = require("./config");
var axios = require("axios").default;
var url = require("url");
// var producer = require("./producer").producer;
var logger = require("./logger").logger;
const { Pool } = require('pg');
const get = require('lodash/get');

const set = require('lodash/set');
var FormData = require("form-data");
const uuidv4 = require("uuid/v4");

const pool = new Pool({
  user: config.DB_USER,
  host: config.DB_HOST,
  database: config.DB_NAME,
  password: config.DB_PASSWORD,
  port: config.DB_PORT,
});

auth_token = config.auth_token;


async function search_user(uuid, tenantId, requestinfo) {
  return await axios({
    method: "post",
    url: url.resolve(config.host.user, config.paths.user_search),
    data: {
      RequestInfo: requestinfo.RequestInfo,
      uuid: [uuid],
      tenantId: tenantId,
    },
  });
}


async function search_workflow(applicationNumber, tenantId, requestinfo) {
  var params = {
    tenantId: tenantId,
    businessIds: applicationNumber,
  };
  return await axios({
    method: "post",
    url: url.resolve(config.host.workflow, config.paths.workflow_search),
    data: requestinfo,
    params,
  });
}

async function search_mdms(request) {
  return await axios({
    method: "post",
    url: url.resolve(config.host.mdms, config.paths.mdms_search),
    data: request
  });
}




async function search_localization(request, lang, module, tenantId) {
  return await axios({
    method: "post",
    url: url.resolve(config.host.localization, config.paths.localization_search),
    data: request,
    params: {
      "locale": lang,
      "module": module,
      "tenantId": tenantId.split(".")[0]
    }
  });
}

async function create_pdf(tenantId, key, data, requestInfo) {
  logger.info(`creating a pdf for key ${key}`);
  logger.debug(JSON.stringify(data))
  const respone =  await axios({
    responseType: "stream",
    method: "post",
    url: url.resolve(config.host.pdf, config.paths.pdf_create),
    data: Object.assign(requestInfo, data),
    params: {
      tenantId: tenantId,
      key: key,
    },
  });

  return respone;
}

async function create_pdf_and_upload(tenantId, key, data, requestinfo) {
  return await axios({
    //responseType: "stream",
    method: "post",
    url: url.resolve(config.host.pdf, config.paths.pdf_create_upload),
    data: Object.assign(requestinfo, data),
    params: {
      tenantId: tenantId,
      key: key,
    },
  });
}



function search_payment_details(request) {
  return new Promise((resolve, reject) => {
    let newRequest = JSON.parse(JSON.stringify(request))
    let promise = new axios({
      method: "POST",
      url: url.resolve(config.host.expense, config.paths.expense_payment_search),
      data: newRequest,
    });
    promise.then((data) => {
      resolve(data.data)
    }).catch((err) => reject(err))
  })
}

/**
 *
 * @param {*} filename -name of localy stored temporary file
 * @param {*} tenantId - tenantID
 */
async function upload_file_using_filestore(filename, tenantId, fileData) {
  try {
    var url = `${config.host.filestore}/filestore/v1/files?tenantId=${tenantId}&module=billgen&tag=works-billgen`;
    var form = new FormData();
    form.append("file", fileData, {
      filename: filename,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    let response = await axios.post(url, form, {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        ...form.getHeaders()
      }
    });
    return get(response.data, "files[0].fileStoreId");
  } catch (error) {
    console.log(error);
    throw(error)
  }
};

async function getPublicServiceApplicationDetails(tenantId, serviceCode, applicationNumber) {
  const params = { applicationNumber };
  const searchEndpoint = `${config.paths.publicService_search}/${serviceCode}`;
  const requestUrl = url.resolve(config.host.publicService, searchEndpoint);

  logger.info(`Making the application search for App no ${applicationNumber} of service ${serviceCode}`);
  logger.info(`URL for application search ${requestUrl}`);

  try {
    const response = await axios({
      method: "get",
      url: requestUrl,
      params,
      headers: {
        "X-Tenant-Id": tenantId,
      },
    });

    // Return only the Application array from the response
    return {
      Application: get(response, "data.Application", [])
    };
  } catch (error) {
    logger.error(`Error fetching application details for App no ${applicationNumber} of service ${serviceCode}`);
    logger.error(error.stack || error);
    return [];
  }
}
const getBaseMDMSData = async (tenantId) => {
  try {
    const request = {
      RequestInfo: {},
      MdmsCriteria: {
        tenantId: tenantId.split(".")[0],
        moduleDetails: [
          {
            moduleName: "common-masters",
            masterDetails: [{ name: "StateInfo" }],
          },
          {
            moduleName: "tenant",
            masterDetails: [{ name: "tenants" }],
          },
        ],
      },
    };
    logger.debug(`getBaseData request ${JSON.stringify(request )}`);
    const response = await search_mdms(request);    

    return {
      MdmsRes: get(response, "data.MdmsRes", {})
    };
  } catch (error) {
    logger.error(error.stack || error);
    return null;
  }
};


module.exports = {
  pool,
  create_pdf,
  create_pdf_and_upload,
  search_mdms,
  search_user,
  search_workflow,
  search_mdms,
  search_localization,
  search_payment_details,
  upload_file_using_filestore,
  getPublicServiceApplicationDetails,
  getBaseMDMSData
};
