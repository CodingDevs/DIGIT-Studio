import React from 'react';
import DigitDemoComponent from './digitDemoComponent';
import { useParams } from 'react-router-dom';
import { generateFormConfig } from '../../../utils/generateFormConfigFromSchemaUtil';
import { Loader } from '@egovernments/digit-ui-react-components';

//field map to map the formdata unique identified and response unique identifier
const fieldNameMap = {
  streetName : "addressLine1"
};

//creating formdata documents array to prefill document data
const mapDocumentsToUploadedDocs = (documents = [], tenantId = "dev") => {
  const uploadedDocs = {};

  documents.forEach((doc) => {
    const docType = doc.documentType;
    const fileStoreId = doc.fileStoreId;

    if (!uploadedDocs[docType]) {
      uploadedDocs[docType] = [];
    }

    uploadedDocs[docType].push([
      docType, // filename if available elsewhere can be added here
      {
        file: {},
        fileStoreId: {
          fileStoreId,
          tenantId,
        },
      },
    ]);
  });

  return uploadedDocs;
};

//util to convert the search response in formdata srtucture to prefill the values
const generateFormDataFromSearch = (config = [], searchData = {}, module, service, tenantId) => {
    const formData = {response: searchData?.response || {}};
  
    config.forEach((section) => {
      const sectionName = section?.name;
      // if (!sectionName) return;
      if (section?.type === "multiChildForm" && Array.isArray(searchData[sectionName])) {
        formData[sectionName] = searchData[sectionName].map((item) => {
          const entry = {};
          section.body?.forEach((field) => {
            const fieldName = field?.populators?.name;
            const fieldType = field?.type;
            const responseKey = fieldNameMap[fieldName] || fieldName;
            const schema = field?.populators?.mdmsConfig?.localePrefix;
            const rawValue = item?.[responseKey];
            if (fieldName) {
              entry[fieldName] = transformValue(fieldType, rawValue, schema ? schema : `${module}_${service}`);
            }
          });
          return entry;
        });
      } else if (section.type === "childform") {
        const child = {};
        section.body?.forEach((field) => {
          const fieldName = field?.populators?.name;
          const fieldType = field?.type;
          const responseKey = fieldNameMap[fieldName] || fieldName;
          const schema = field?.populators?.mdmsConfig?.localePrefix;
          const rawValue = searchData[sectionName]?.[responseKey];
          if (fieldName) {
            child[fieldName] = transformValue(fieldType, rawValue, schema ? schema : `${module}_${service}`);
          }
        });
        formData[sectionName] = child;
      } else if (section.type === "documents") {
        //formData["section_6"]["uploaded"] = "";
        if (!formData["section_6"]) {
          formData["section_6"] = {};
        }
        formData["section_6"]["uploadedDocs"] = mapDocumentsToUploadedDocs(searchData.documents || [], tenantId);
      }
    });
  
    return formData;
  };
  
  //function to transfer feild values 
  const transformValue = (type, rawValue, prefix) => {
    if (rawValue === undefined || rawValue === null) return rawValue;
    switch (type) {
      case "radioordropdown":
        return { code: rawValue, name: `${prefix.replaceAll(".", "_").toUpperCase()}_${rawValue.toUpperCase()}` };
      case "number":
        // Convert string numbers to actual numbers for number type fields
        if (typeof rawValue === "string" && !isNaN(rawValue) && rawValue.trim() !== "") {
          const numVal = Number(rawValue);
          if (!isNaN(numVal)) {
            return numVal;
          }
        }
        return rawValue;
      default:
        return rawValue;
    }
  };
  

const DigitDemoEditComponent = () => {
    const { module, service } = useParams();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const queryStrings = Digit.Hooks.useQueryParams();


     //to get the fetched application details
  const request = {
    url : `/public-service/v1/application/${queryStrings?.serviceCode}`,
    headers: {
      "X-Tenant-Id" : tenantId,
      "auth-token" : window?.localStorage?.getItem("Employee.token"),
    },
    method: "GET",
    params: {
      "applicationNumber": queryStrings?.applicationNumber,
      "tenantId" : tenantId
    }
  }
  const {isLoading, data : response} = Digit.Hooks.useCustomAPIHook(request);
    // let response = {
    //    Application: [
    //     {
    //       "id": "6918f8bb-3613-43a4-8614-cd8296599dec",
    //       "tenantId": "dev",
    //       "module": "Tradelicense",
    //       "businessService": "NewTL",
    //       "status": "ACTIVE",
    //       "channel": "counter",
    //       "applicationNumber": "APL-2025-06-17-000209",
    //       "reference": null,
    //       "workflowStatus": "applied",
    //       "serviceCode": "SVC-DEV-TRADELICENSE-NEWTL-04",
    //       "serviceDetails": {
    //           "accessories": [
    //               {
    //                   "accessoryType": "ACC-1"
    //               }
    //           ],
    //           "tradeDetails": {
    //               "financialYear": "2015-16",
    //               "licenseType": "PERMANENT",
    //               "tradeCommencementDate": "2025-06-04",
    //               "tradeName": "tradeeee",
    //               "tradeStructureSubType": "PERMANENT_BUILDING",
    //               "tradeStructureType": "OWNED_PREMISES"
    //           },
    //           "tradeUnits": {
    //               "tradeCategory": "TECHNOLOGY",
    //               "tradeSubType": "APP_DEVELOPERS",
    //               "tradeType": "SOFTWARE_DEVELOPMENT"
    //           }
    //       },
    //       "applicants": [
    //           {
    //               "id": "6f5d737e-574a-4777-a392-b54d97cd25a9",
    //               "type": "CITIZEN",
    //               "userId": "IND-2025-06-17-031287",
    //               "name": "owneeee",
    //               "mobileNumber": 9987263636,
    //               "emailId": "user1@example.com",
    //               "prefix": "",
    //               "active": true
    //           },
    //           {
    //               "id": "6f5d737e-574a-4777-a392-b54d97cd25a9",
    //               "type": "CITIZEN",
    //               "userId": "IND-2025-06-17-031287",
    //               "name": "owneeee",
    //               "mobileNumber": 9987263636,
    //               "emailId": "user1@example.com",
    //               "prefix": "",
    //               "active": true
    //           },
    //           {
    //               "id": "6f5d737e-574a-4777-a392-b54d97cd25a9",
    //               "type": "CITIZEN",
    //               "userId": "IND-2025-06-17-031287",
    //               "name": "owneeee",
    //               "mobileNumber": 9987263636,
    //               "emailId": "user1@example.com",
    //               "prefix": "",
    //               "active": true
    //           }
    //       ],
    //       "additionalDetails": {
    //           "ref1": "val1"
    //       },
    //       "address": {
    //           "id": "ebedd133-a82a-4be2-96d2-7138d6a97109",
    //           "tenantId": "dev",
    //           "latitude": 0,
    //           "longitude": 0,
    //           "addressNumber": "1",
    //           "addressLine1": "street 9",
    //           "addressLine2": "",
    //           "landmark": "",
    //           "city": "",
    //           "pincode": "125433",
    //           "detail": "",
    //           "hierarchyType": "REVENUE",
    //           "boundarylevel": "locality",
    //           "boundarycode": "dev.city"
    //       },
    //       "workflow": {
    //           "id": "d16f22fc-dd13-4723-b545-5ba21a23cfde",
    //           "action": "SAVE",
    //           "businessService": "Tradelicense.NewTL",
    //           "comment": "",
    //           "assignees": [],
    //           "documents": null
    //       },
    //       "auditDetails": {
    //           "createdBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //           "lastModifiedBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //           "createdTime": 1750150503000,
    //           "lastModifiedTime": 1750150503000
    //       },
    //       "processInstance": [
    //           {
    //               "id": "16beae93-0c01-4fe1-85f2-dcadd4b02370",
    //               "tenantId": "dev",
    //               "businessService": "Tradelicense.NewTL",
    //               "businessId": "APL-2025-06-17-000209",
    //               "action": "SAVE",
    //               "moduleName": "public-services",
    //               "state": {
    //                   "uuid": "7ce5eeff-fa13-41b1-a846-201922807a59",
    //                   "tenantId": "dev",
    //                   "businessServiceId": "9841bce6-c90a-474d-8591-76270db0399c",
    //                   "state": "PENDING_FOR_VERIFICATION",
    //                   "applicationStatus": "INWORKFLOW",
    //                   "actions": [
    //                       {
    //                           "uuid": "c5fdca20-ff7a-4e9a-9ebc-aa9bb268ef6f",
    //                           "tenantId": "dev",
    //                           "currentState": "7ce5eeff-fa13-41b1-a846-201922807a59",
    //                           "action": "VERIFY_AND_FORWARD",
    //                           "nextState": "cfd42fb8-88ac-4e45-85c2-54278a51490d",
    //                           "roles": [
    //                               "CITIZEN",
    //                               "ARCHITECT",
    //                               "STUDIO_ADMIN"
    //                           ],
    //                           "auditDetails": {
    //                               "createdBy": "00000000-0000-0000-0000-000000000000",
    //                               "lastModifiedBy": "00000000-0000-0000-0000-000000000000",
    //                               "createdTime": 0,
    //                               "lastModifiedTime": 0
    //                           }
    //                       },
    //                       {
    //                           "uuid": "44b60bbc-cb38-4d26-82a4-f9e10f82f56d",
    //                           "tenantId": "dev",
    //                           "currentState": "7ce5eeff-fa13-41b1-a846-201922807a59",
    //                           "action": "SEND_BACK",
    //                           "nextState": "ac49ca8f-60a7-447d-81ff-a29663a8efab",
    //                           "roles": [
    //                               "CITIZEN",
    //                               "ARCHITECT",
    //                               "STUDIO_ADMIN"
    //                           ],
    //                           "auditDetails": {
    //                               "createdBy": "00000000-0000-0000-0000-000000000000",
    //                               "lastModifiedBy": "00000000-0000-0000-0000-000000000000",
    //                               "createdTime": 0,
    //                               "lastModifiedTime": 0
    //                           }
    //                       }
    //                   ],
    //                   "auditDetails": {
    //                       "createdBy": "00000000-0000-0000-0000-000000000000",
    //                       "lastModifiedBy": "00000000-0000-0000-0000-000000000000",
    //                       "createdTime": 0,
    //                       "lastModifiedTime": 0
    //                   }
    //               },
    //               "assigner": {
    //                   "uuid": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "userName": "7349125125",
    //                   "name": "Debasish",
    //                   "mobileNumber": "7349125125",
    //                   "emailId": "",
    //                   "locale": null,
    //                   "type": "EMPLOYEE",
    //                   "roles": [
    //                       {
    //                           "name": "STUDIO ARCHITECT",
    //                           "code": "ARCHITECT",
    //                           "tenantId": "dev"
    //                       },
    //                       {
    //                           "name": "STUDIO ADMIN",
    //                           "code": "STUDIO_ADMIN",
    //                           "tenantId": "dev"
    //                       },
    //                       {
    //                           "name": "Localisation admin",
    //                           "code": "LOC_ADMIN",
    //                           "tenantId": "dev"
    //                       }
    //                   ],
    //                   "active": false,
    //                   "tenantId": "dev",
    //                   "permanentCity": null
    //               },
    //               "stateSla": 172788342,
    //               "businesssServiceSla": 5183988342,
    //               "auditDetails": {
    //                   "createdBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "lastModifiedBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "createdTime": 1750150502673,
    //                   "lastModifiedTime": 1750150502673
    //               }
    //           }
    //       ],
    //       "documents": [
    //           {
    //               "id": "9faa6657-2aba-4a94-ab7e-341edad26451",
    //               "documentType": "address-proof",
    //               "fileStoreId": "4a8c9a5c-9f2e-4f37-a30d-3afdde6e4f3a",
    //               "auditDetails": {
    //                   "createdBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "lastModifiedBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "createdTime": 1750150503000,
    //                   "lastModifiedTime": 1750150503000
    //               }
    //           },
    //           {
    //               "id": "7a2091aa-3ada-44a1-8bf4-53a669391933",
    //               "documentType": "identity-proof",
    //               "fileStoreId": "5b6607f7-d108-42a1-a30c-8021d94aa886",
    //               "auditDetails": {
    //                   "createdBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "lastModifiedBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "createdTime": 1750150503000,
    //                   "lastModifiedTime": 1750150503000
    //               }
    //           },
    //           {
    //               "id": "bd698b68-60fa-4936-b258-8f84a0854703",
    //               "documentType": "owner-photo",
    //               "fileStoreId": "87faccc0-9c94-40f3-bad1-3bce6537eb0b",
    //               "auditDetails": {
    //                   "createdBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "lastModifiedBy": "cf0b9ce6-9654-4e5e-bdbe-3e293a08786e",
    //                   "createdTime": 1750150503000,
    //                   "lastModifiedTime": 1750150503000
    //               }
    //           }
    //       ]
    //   }
    //       ]
    // }

   // Fetch service configuration from MDMS
   const requestCriteria = {
    url: "/egov-mdms-service/v2/_search",
    body: {
      MdmsCriteria: {
        tenantId: tenantId,
        schemaCode: "Studio.ServiceConfiguration",
        filters:{
          module:module
        }
      },
    },
  };
  const { isLoading: moduleListLoading, data } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  const config = data?.mdms?.find((item) =>
    item?.uniqueIdentifier.toLowerCase() === `${module}.${service}`.toLowerCase()
  );  

  const Updatedconfig = {
    ServiceConfiguration: [config?.data],
    tenantId,
    module,
  };

  //logic to handle steps in apply screen flow
  const rawConfig = generateFormConfig(Updatedconfig, module?.toUpperCase(), service?.toUpperCase());

    let formdata = {
        applicantDetails : response?.Application?.[0]?.applicants,
        address: response?.Application?.[0]?.address,
        documents: response?.Application?.[0]?.documents,
        ...response?.Application?.[0]?.serviceDetails,
        response : response?.Application?.[0],

    }
    const updatedFormData = generateFormDataFromSearch(rawConfig,formdata, module?.toUpperCase(), service?.toUpperCase(),tenantId);

    if (moduleListLoading || isLoading) return <Loader />;
  return (
    <div>
      <DigitDemoComponent editdata={updatedFormData}/>
    </div>
  );
};

export default DigitDemoEditComponent;