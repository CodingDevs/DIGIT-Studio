import _ from "lodash";
import { UICustomizations } from "../configs/UICustomizations";
import { useQuery, useQueryClient } from "react-query";
import cloneDeep from "lodash/cloneDeep";


  /* To Overide any existing libraries  we need to use similar method */
  const setupLibraries = (Library, service, method) => {
    window.Digit = window.Digit || {};
    window.Digit[Library] = window.Digit[Library] || {};
    window.Digit[Library][service] = method;
  };
  
  /* To Overide any existing config/middlewares  we need to use similar method */
 export const updateCustomConfigs = () => {
    setupLibraries("Customizations", "commonUiConfig", { ...window?.Digit?.Customizations?.commonUiConfig, ...UICustomizations });
    // setupLibraries("Utils", "parsingUtils", { ...window?.Digit?.Utils?.parsingUtils, ...parsingUtils });
  };

  const getServiceDetails = (formData) => {
    const excludedKeys = ["address", "applicantDetails", "uploadedDocs", "uploaded"];
    const validSections = Object.keys(formData).reduce((acc, key) => {
      if (!excludedKeys.includes(key) &&
      !key.startsWith("section_")) {
        acc[key] = formData[key];
      }
      return acc;
    }, {});
    const flattenValues = (obj) => {
      const flat = {};
      for (const [key, val] of Object.entries(obj)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          flat[key] = val && typeof val === "object" && "code" in val ? val.code : val;
        } else {
          flat[key] = val;
        }
      }
      return flat;
    };
  
    const serviceDetails = {};
  
    for (const [sectionKey, sectionVal] of Object.entries(validSections)) {
      if (Array.isArray(sectionVal)) {
        // Direct arrays (not common in your example, but for safety)
        serviceDetails[sectionKey] = sectionVal.map((item) => flattenValues(item));
      } else if (typeof sectionVal === "object" && sectionVal !== null) {
        const innerKeys = Object.keys(sectionVal);
        if (innerKeys.length === 1 && Array.isArray(sectionVal[innerKeys[0]])) {
          // e.g., accessories: { accessories: [ { accessoryType: {...} } ] }
          const innerKey = innerKeys[0];
          serviceDetails[sectionKey] = {
            [innerKey]: sectionVal[innerKey].map((item) => {
              const itemKey = Object.keys(item)[0];
              const itemVal = item[itemKey];
              return {
                [itemKey]: typeof itemVal === "object" && itemVal?.code ? itemVal.code : itemVal
              };
            })
          };
        } else {
          // Normal object: flatten one level
          serviceDetails[sectionKey] = flattenValues(sectionVal);
        }
      } else {
        // Primitive value directly (unexpected case)
        serviceDetails[sectionKey] = sectionVal;
      }
    }
    return serviceDetails;
  };
  


  const transformUploadedDocs = (uploadedDocs = {}) => {
    const documents = [];
  
    Object.entries(uploadedDocs).forEach(([docType, docEntries]) => {
      docEntries?.forEach(([fileName, docMeta]) => {
        const fileStoreId = docMeta?.fileStoreId?.fileStoreId;
  
        if (fileStoreId) {
          documents.push({
            documentType: docType,
            fileStoreId: fileStoreId,
            documentUid: null, // Reusing fileStoreId as UID if no separate UID exists
            additionalDetails: {}
          });
        }
      });
    });
  
    return documents;
  };  

  export const transformToApplicationPayload = (formData, configMap, service, tenantId, config, workflowDetails) => {
    const currentConfig = configMap?.ServiceConfiguration?.find(ob => ob?.service === service);
  
    const serviceDetails = getServiceDetails(formData);
  
    const applicants = formData.applicantDetails?.filter(Boolean)?.map((applicant, index) => ({
      type: "CITIZEN",
      name: applicant?.OwnerName,
      mobileNumber: Number(applicant?.mobileNumber),
      emailId: applicant?.email || `user${index + 1}@example.com`,
      prefix: "91",
      active: true,
    })) || [];
  
    const documents = transformUploadedDocs(formData?.uploadedDocs);
  
    const requestBody = {
      Application: {
        tenantId,
        module: currentConfig?.module,
        businessService: currentConfig?.service,
        status: "INACTIVE",
        channel: "counter",
        reference: null,
        workflowStatus: "applied",
        serviceDetails: {
          ...serviceDetails
        },
        applicants,
        address: {
          tenantId,
          latitude: 0,
          longitude: 0,
          addressNumber: "1",
          addressLine1: formData.tradeAddress?.streetName || "",
          addressLine2: "",
          landmark: "",
          city: formData.tradeAddress?.city?.name || "",
          pincode: formData.tradeAddress?.pincode,
          hierarchyType: currentConfig?.boundary?.hierarchyType,
          boundarylevel: currentConfig?.boundary?.lowestLevel,
          boundarycode: `dev.${formData.tradeAddress?.city?.code?.toLowerCase() || "city"}`,
        },
        documents, // <-- documents as top-level key
        additionalDetails: {
          ref1: "val1" 
        },
        Workflow: {
          action: workflowDetails?.BusinessServices?.[0]?.states.filter((ob) => ob?.state === null)?.[0]?.actions?.[0]?.action,
          comment: "",
          assignees: [],
          businessService: config?.data?.workflow?.businessService
        }
      }
    };
  
    return requestBody;
  };



  export const generateViewConfigFromResponse = (application, t, currentBusinessService, serviceConfig) => {
  
    const extractSectionValues = (data, prefix) => {
      const shouldTranslate = (value) => {
        if (typeof value !== "string") return false;
        const cleaned = value.replace(/-/g, "_");
        const hasOnlyNumbersOrDate = /^[\d_\-]+$/.test(value);
        return (
          cleaned.includes("_") &&
          !hasOnlyNumbersOrDate &&
          /^[A-Z_]+$/.test(cleaned)
        );
      };
  
      const formatField = (key, value) => {
        const isTranslate = shouldTranslate(value);
        const cleanedValue = typeof value === "string" ? value.replace(/-/g, "_") : value;
        return {
          key: t
            ? t(`${application?.module.toUpperCase()}_${application?.businessService.toUpperCase()}_${key.toUpperCase()}`)
            : key,
          value: isTranslate ? (t ? t(`COMMON_${key.toUpperCase()}_${cleanedValue}`) : cleanedValue) : (value || "NA"),
          isTranslate,
        };
      };
  
      if (Array.isArray(data)) {
        return data.flatMap((item, index) => {
          const itemFields = Object.keys(item || {})
            .filter((key) => {
              const value = item[key];
              return key.toLowerCase() !== "id" && value !== undefined && value !== null && value !== "";
            })
            .map((key) => formatField(key, item[key]));
          if (itemFields.length > 0) {
            return [
              {
                key: `${t(`${application?.module.toUpperCase()}_${application?.businessService?.toUpperCase()}_${prefix.toUpperCase()}`)} ${index + 1}`, // <-- Label only, no value
                value: "",
                isTranslate: false,
              },
              ...itemFields,
            ];
          }
          return [];
        });
      } else {
        return Object.keys(data || {})
          .filter((key) => {
            const value = data[key];
            return key.toLowerCase() !== "id" && value !== undefined && value !== null && value !== "";
          })
          .map((key) => formatField(key, data[key]));
      }
    };
  
    const serviceDetails = application.serviceDetails || {};
    const addressDetails = application.address || {};
    const applicants = application.applicants || [];
  
    const cards = [];
  
    // Service Details card
    if (Object.keys(serviceDetails).length > 0) {
      const serviceSections = Object.keys(serviceDetails)
        .map((serviceKey) => {
          const data = serviceDetails[serviceKey];
          const values = extractSectionValues(data, `${serviceKey.toUpperCase()}`);
          if (values.length > 0) {
            const headerKey = `${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}_${serviceKey.toUpperCase()}`;
            return {
              head: t(headerKey),
              type: "DATA",
              sectionHeader: { value: t(headerKey), inlineStyles: {} },
              values,
            };
          }
          return null;
        })
        .filter(Boolean);
  
      if (serviceSections.length > 0) {
        cards.push({
          sections: serviceSections,
        });
      }
    }
  
    // Address Details card
    const addressValues = extractSectionValues(addressDetails, "ADDRESS");
    if (addressValues.length > 0) {
      const headerKey = `${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}_ADDRESS_DETAILS`;
      cards.push({
        sections: [
          {
            head: headerKey,
            type: "DATA",
            sectionHeader: { value: headerKey, inlineStyles: {} },
            values: addressValues,
          },
        ],
      });
    }
  
    // Applicant Details card (single header, multiple applicants with labels)
    if (Array.isArray(applicants) && applicants.length > 0) {
      const applicantValues = extractSectionValues(applicants, "APPLICANT");
      cards.push({
        sections: [
          {
            head: `${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}_APPLICANT DETAILS`,
            type: "DATA",
            sectionHeader: { value: `${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}_APPLICANT DETAILS`, inlineStyles: {} },
            values: applicantValues,
          },
        ],
      });
    }
    //documents enablement
    const rawDocuments = application?.additionalDetails?.documents || {};
    const flattenedDocuments = [];

    Object.entries(rawDocuments).forEach(([docType, docEntries]) => {
      docEntries.forEach((entry) => {
        const [fileName, fileObj] = entry || [];
        const fileStoreId = fileObj?.fileStoreId?.fileStoreId;

        if (fileStoreId) {
          flattenedDocuments.push({
            title: docType || "NA",
            documentType: docType || "NA",
            documentUid: fileName || "NA",
            fileStoreId: fileStoreId,
          });
        }
      });
    });

    if (flattenedDocuments.length > 0) {
      cards.push({
        navigationKey: "card-documents",
        sections: [
          {
            type: "DOCUMENTS",
            documents: [
              {
                title: `${application?.module.toUpperCase()}_${application?.businessService.toUpperCase()}_DOCUMENTS`, // or any module-specific label
                BS: application.module || "Module",
                values: flattenedDocuments,
              },
            ],
            inlineStyles: {
              // marginTop: "1rem",
            },
          },
        ],
      });
    }
  
    // Workflow History & Actions card
    cards.push({
      navigationKey: "card1",
      sections: [
        {
          type: "WFHISTORY",
          businessService: currentBusinessService || serviceConfig?.data?.workflow?.businessService,
          applicationNo: application.applicationNumber,
          tenantId: application.tenantId,
          timelineStatusPrefix: `WF_${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}`,
          breakLineRequired: false,
          config: {
            select: (data) => {
              return { ...data, timeline: data?.timeline?.filter((ob) => ob?.performedAction !== "DRAFT") };
            },
          },
        },
        // {
        //   type: "WFACTIONS",
        //   forcedActionPrefix: `WF_${application?.module?.toUpperCase()}_${application?.businessService?.toUpperCase()}_ACTION`,
        //   businessService: application.businessService,
        //   applicationNo: application.applicationNumber,
        //   tenantId: application.tenantId,
        //   applicationDetails: application,
        //   url: `/public-service/v1/application/${application?.serviceCode}`,
        //   moduleCode: application.module,
        // },
      ],
    });
  
    const config = {
      cards,
      apiResponse: application,
      additionalDetails: application.additionalDetails || {},
      horizontalNav: {
        showNav: false,
        configNavItems: [],
        activeByDefault: "",
      },
    };
  
    return config;
  };
  
  
  export const transformResponseforModulePage = (data) => {
    const moduleData = {}; // Object to store modules and their corresponding business services
  
    // Process each item
    data.forEach((item) => {
      const module = item.module;
  
      // If module is already processed, add the businessService to its list
      if (!moduleData[module]) {
        moduleData[module] = {
          heading: `${module.toUpperCase()}_HEADING`,
          cardDescription: `${module.toUpperCase()}_CARDDESCRIPTION`,
          businessServices: new Set(), // Set to store unique businessServices
          module: module,
          //serviceCode : item?.serviceCode
        };
      }
  
      // Add the businessService to the set (to ensure uniqueness)
      moduleData[module].businessServices.add({businessService : item.businessService, serviceCode: item?.serviceCode});
    });
  
    // Convert the moduleData object to an array of objects
    return Object.keys(moduleData).map((module) => {
      const moduleInfo = moduleData[module];
      return {
        heading: moduleInfo.heading,
        cardDescription: moduleInfo.cardDescription,
        businessServices: Array.from(moduleInfo.businessServices), // Convert the Set to an array
        module: module,
        //serviceCode : moduleInfo?.serviceCode,
      };
    });
  };
  

  export const getServicesOptions = (services,module) => {
    const options = services?.filter((ob) => ob?.module === module && ob?.status === "ACTIVE").map((ob) =>  {return { code: ob?.businessService, name: ob?.businessService, serviceCode: ob?.serviceCode }});
    return options;
  }

  export const useWorkflowDetails = ({ tenantId, id, moduleCode, role = "CITIZEN", serviceData = {}, getStaleData, getTripData = false, config }) => {
    const queryClient = useQueryClient();
  
    const staleDataConfig = { staleTime: Infinity };
    
  
    const { isLoading, error, isError, data } = useQuery(
        ["workFlowDetailsWorks", tenantId, id, moduleCode, role, config],
        () => getDetailsByIdWorks({ tenantId, id, moduleCode, role, getTripData }),
        getStaleData ? { ...staleDataConfig, ...config } : config
    );
  
    if (getStaleData) return { isLoading, error, isError, data };
  
    return { isLoading, error, isError, data, revalidate: () => queryClient.invalidateQueries(["workFlowDetailsWorks", tenantId, id, moduleCode, role]) };
  };

  export const  getDetailsByIdWorks = async ({ tenantId, id, moduleCode }) => {

    //process instance search
    const workflow = await Digit.WorkflowService.getByBusinessId(tenantId, id , { businessService : moduleCode });
    const applicationProcessInstance = cloneDeep(workflow?.ProcessInstances);
    //business service search
    const businessServiceResponse = (await Digit.WorkflowService.init(tenantId, moduleCode))?.BusinessServices[0]?.states;

    if (workflow && workflow.ProcessInstances) {
      const processInstances = workflow.ProcessInstances;
      const nextStates = processInstances[0]?.nextActions.map((action) => ({ action: action?.action, nextState: processInstances[0]?.state.uuid }));
      const nextActions = nextStates.map((id) => ({
        action: id.action,
        state: businessServiceResponse?.find((state) => state.uuid === id.nextState),
      }));

      /* To check state is updatable and provide edit option*/
      const currentState = businessServiceResponse?.find((state) => state.uuid === processInstances[0]?.state.uuid);
      
      // if current state is editable then we manually append an edit action
      //(doing only for muster)
      //beacuse in other module edit action is defined in workflow
      
      // if (currentState && currentState?.isStateUpdatable && moduleCode==="muster-roll-approval" ) {
      //   nextActions.push({ action: "EDIT", state: currentState });
      //  }
      // Check when to add Edit action(In Estimate only when send back to originator action is taken)

      const getStateForUUID = (uuid) => businessServiceResponse?.find((state) => state.uuid === uuid);

      //this actionState is used in WorkflowActions component
      const actionState = businessServiceResponse
        ?.filter((state) => state.uuid === processInstances[0]?.state.uuid)
        .map((state) => {
          let _nextActions = state.actions?.map?.((ac) => {
            let actionResultantState = getStateForUUID(ac.nextState);
            let assignees = actionResultantState?.actions?.reduce?.((acc, act) => {
              return [...acc, ...act.roles];
            }, []);
            return { ...actionResultantState, assigneeRoles: assignees, action: ac.action, roles: ac.roles };
          });
          // if (state?.isStateUpdatable && moduleCode==="MR") {
          //   _nextActions.push({ action: "RE-SUBMIT", ...state, roles: state?.actions?.[0]?.roles })
          // }
          //CHECK WHEN EDIT ACTION TO BE SHOWN
          return { ...state, nextActions: _nextActions, roles: state?.action, roles: state?.actions?.reduce((acc, el) => [...acc, ...el.roles], []) };
        })?.[0];


        //mapping nextActions with suitable roles
      const actionRolePair = nextActions?.map((action) => ({
        action: action?.action,
        roles: action.state?.actions?.map((action) => action.roles).join(","),
      }));


      if (processInstances.length > 0) {
        // const EnrichedWfData = await makeCommentsSubsidariesOfPreviousActions(processInstances)
        //if any documents are there this fn will add thumbnails to show
        
        await makeCommentsSubsidariesOfPreviousActionsWorks(processInstances)
        let timeline = processInstances?.map((instance, ind) => {
          let checkPoint = {
            performedAction: instance.action,
            status: instance.state.applicationStatus,
            state: instance.state.state,
            assigner: instance?.assigner,
            rating: instance?.rating,
            businessService: instance?.businessService,
            // wfComment: instance?.wfComments?.map(e => e?.comment),
            comment:instance?.comment,
            wfDocuments: instance?.documents,
            thumbnailsToShow: { thumbs: instance?.thumbnailsToShow?.thumbs, fullImage: instance?.thumbnailsToShow?.images },
            assignes: instance.assignes,
            caption: instance.assignes ? instance.assignes?.map((assignee) => ({ name: assignee.name, mobileNumber: assignee.mobileNumber })) : null,
            auditDetails: {
              created: Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.createdTime),
              lastModified: Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.lastModifiedTime),
              lastModifiedEpoch: instance.auditDetails.lastModifiedTime,
            },
            isTerminateState : instance?.state?.isTerminateState
          };
          return checkPoint;
        });

        const details = {
          timeline,
          nextActions:actionRolePair,
          actionState,
          applicationBusinessService: workflow?.ProcessInstances?.[0]?.businessService,
          processInstances: applicationProcessInstance,
          triggerParallelWorkflow: businessServiceResponse?.filter((state) => state.uuid === workflow?.ProcessInstances?.[0]?.state.uuid)?.[0]?.triggerParallelWorkflows || ["FIRE","HEALTH","BUILDING"],
        };
        

        return details;
      }
    } else {
      throw new Error("error fetching workflow services");
    }
    return {};
  }

  export const getAllDetails = async (tenantId, id, moduleCodes) => {
    try {
      const results = await Promise.all(
        moduleCodes.map((code) =>
          getDetailsByIdWorks({ tenantId, id, moduleCode: code }).catch((err) => {
            console.error(`Error fetching for ${code}:`, err);
            return null; // or return an error object
          })
        )
      );
  
      // Filter out failed or null results if needed
      const validResults = results.filter((res) => res !== null);
  
      return validResults;
    } catch (err) {
      console.error("Unexpected error:", err);
      return [];
    }
  };

  export const processBusinessServices = async(serviceConfig,tenantId,applicationNumber,workflowDetails,userRoles,t) => {
    let matchedBusinessServices = [{
      code: serviceConfig?.data?.workflow?.businessService,
      displayname: t(`SERVICE_${serviceConfig?.data?.workflow?.businessService}`) || serviceConfig?.data?.workflow?.businessService
    }];
  
    const allDetails = await getAllDetails(
      tenantId,
      applicationNumber,
      workflowDetails?.triggerParallelWorkflow
    );
  
    const filtered = allDetails.reduce((acc, detail) => {
      if (!detail?.nextActions || !detail?.applicationBusinessService) return acc;
  
      const hasMatchingRole = detail.nextActions.some((action) => {
        const roles = action.roles?.split(",") || [];
        return roles.some((role) => userRoles.includes(role));
      });
  
      if (hasMatchingRole) {
        acc.push({
          code: detail.applicationBusinessService,
          displayname: t(`SERVICE_${detail.applicationBusinessService}`) || detail.applicationBusinessService
        });
      }
  
      return acc;
    }, []);

  matchedBusinessServices = [...matchedBusinessServices, ...filtered];

  return matchedBusinessServices;
}

  const getThumbnailsWorks = async (ids, tenantId, documents = []) => {

    const res = await Digit.UploadServices.Filefetch(ids, tenantId);
    if (res.data.fileStoreIds && res.data.fileStoreIds.length !== 0) {
      return {
        thumbs: res.data.fileStoreIds.map((o) => o.url.split(",")[3] || o.url.split(",")[0]),
        images: res.data.fileStoreIds.map((o) => Digit.Utils.getFileUrl(o.url))
      };
    } else {
      return null;
    }
  };
  
  const makeCommentsSubsidariesOfPreviousActionsWorks = async (wf) => {
    const TimelineMap = new Map();
    // const tenantId = window.location.href.includes("/obps/") ? Digit.ULBService.getStateId() : wf?.[0]?.tenantId;
   
    
    for (const eventHappened of wf) {
      
      //currenlty in workflow documentUid is getting populated so while update we are sending fileStoreId in documentUid field
      if (eventHappened?.documents) {
        eventHappened.thumbnailsToShow = await getThumbnailsWorks(eventHappened?.documents?.map(e => e?.documentUid || e?.fileStoreId), eventHappened?.tenantId, eventHappened?.documents)
      }
  
        
    }
   
  }

  export const downloadStudioPDF = async (
    pdfRoute,
    queryParams={},
    fileName="application.pdf"
  ) => {
    const response =await Digit.CustomService.getResponse({ url:`/studio-pdf/download/${pdfRoute}`, params:queryParams, useCache:false,setTimeParam:false ,userDownload:true})
    const responseStatus = parseInt(response.status, 10);
    if (responseStatus === 201 || responseStatus === 200) {
      downloadPdf(new Blob([response.data], { type: "application/pdf" }), fileName);
    }
  };

  export const  downloadPdf = (blob, fileName) => {
    if (window.mSewaApp && window.mSewaApp.isMsewaApp() && window.mSewaApp.downloadBase64File) {
      var reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        var base64data = reader.result;
        window.mSewaApp.downloadBase64File(base64data, fileName);
      };
    } else {
      const link = document.createElement("a");
      // create a blobURI pointing to our Blob
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      // some browser needs the anchor to be in the doc
      document.body.append(link);
      link.click();
      link.remove();
      // in case the Blob uses a lot of memory
      setTimeout(() => URL.revokeObjectURL(link.href), 7000);
    }

   
  };

  export const getParallelWorkflow = (module, businessService, serviceData) => {
    let workflowObject = serviceData?.filter((ob) => ob?.uniqueIdentifier === `${module}.${businessService}`)?.[0]?.data?.workflow;
    if (!workflowObject?.states) return [];

      // Collect all triggerParallelWorkflows from the states
      const parallelWorkflows = workflowObject.states
        .filter((state) => Array.isArray(state.triggerParallelWorkflows))
        .flatMap((state) => state.triggerParallelWorkflows);

      return parallelWorkflows;
  }


  
  
  
  


export default {};