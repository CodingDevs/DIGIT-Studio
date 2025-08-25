import { Header, Loader, ViewComposer, MultiLink } from "@egovernments/digit-ui-react-components";
import { Button } from "@egovernments/digit-ui-components";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { downloadStudioPDF, generateViewConfigFromResponse } from "../../../utils";
import WorkflowActions from "../../../components/WorkflowActions";
import ViewCheckListCards from "../CheckList/viewCheckListCards";
import { useWorkflowDetails, processBusinessServices } from "../../../utils";
import { useParams } from "react-router-dom";
const DigitDemoViewComponent = () => {
  const { t } = useTranslation();
  const queryStrings = Digit.Hooks.useQueryParams();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const [selectedBusinessService, setSelectedBusinessService] = useState(null);
  const userInfo = Digit.UserService.getUser();
  const { module, service } = useParams();
  const userRoles = userInfo?.info?.roles?.map((roleData) => roleData?.code);
  const [matchedBusinessServices, setMatchedBusinessServices] = useState([]);
  const [showOptions, setShowOptions] = useState(false);

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
  const {isLoading, data} = Digit.Hooks.useCustomAPIHook(request);
  let response =  data ? data?.Application?.[0] : {};

  //To fetch the service config for the module and service
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

  const { isLoading: ServiceConfigLoading, data: serviceConfigData } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  const serviceConfig = serviceConfigData?.mdms?.find((item) =>
    item?.uniqueIdentifier.toLowerCase() === `${module}.${service}`.toLowerCase()
  );

  //To fetch the workflow details for the application to handle parallel workflow
  let {data :workflowDetails, isLoading: workflowLoading} = useWorkflowDetails(
    {
      tenantId: tenantId,
      id: queryStrings?.applicationNumber,
      moduleCode: queryStrings?.businessService || serviceConfig?.data?.workflow?.businessService,
      //moduleCode: "NewTL",
      config: {
        enabled: response && serviceConfig ? true : false,
        cacheTime: 0
      }
    }
  );
  console.log(workflowLoading,"loadinggg");
  console.log(workflowDetails, "workflowDetails");

  // Util method to generate view config for view composer
  let config = generateViewConfigFromResponse(response,t, queryStrings?.businessService || selectedBusinessService?.code, serviceConfig);


useEffect(() => {
  // Guard clause to avoid calling with missing inputs
  if (!serviceConfig || !tenantId || !queryStrings?.applicationNumber || !workflowDetails) return;

  //To get the eligible business service for the current state of the application
  processBusinessServices(
    serviceConfig,
    tenantId,
    queryStrings?.applicationNumber,
    workflowDetails,
    userRoles,
    t
  ).then((matched) => {
    setMatchedBusinessServices(matched);
  });
}, [
  workflowDetails,
]);

// Auto select business service if there's only one match
useEffect(() => {
  if (matchedBusinessServices.length === 1 && !selectedBusinessService) {
    setSelectedBusinessService(matchedBusinessServices[0]);
  }
}, [matchedBusinessServices, selectedBusinessService]);

  // To get the checklist codes for the application
  let checklistObjects =  serviceConfig?.data?.checklist?.length > 0 && workflowDetails ? serviceConfig?.data?.checklist.filter((ob) => ob?.state === workflowDetails?.actionState?.state) : [];
  let checkListCodes = serviceConfig?.data?.checklist?.length > 0 && workflowDetails ? checklistObjects?.map((ob) => `${response?.businessService}.${workflowDetails?.processInstances?.[0].state?.state}.${ob?.name}`) : [];
  if (isLoading || workflowLoading || ServiceConfigLoading) {
    return <Loader />;
  }

  // Generate PDF download options from config
  const generateDownloadOptions = () => {
    return serviceConfig?.data?.pdf
      .filter(obj => obj.states.includes(response?.workflowStatus))
      .map(obj => ({
        // icon: <WhatsappIcon />, // Uncomment and customize if needed
        label: t(`STUDIO_${obj.type.toUpperCase()}`),
        onClick: () => {
          setShowOptions(!showOptions);
          HandleDownloadPdf(obj.key);
        }
      }));
  };

  const HandleDownloadPdf = (key) => {
      downloadStudioPDF('pdf/generatepdf',{applicationNumber:queryStrings?.applicationNumber,tenantId, serviceCode:queryStrings?.serviceCode, pdfKey:key},`Application-${queryStrings?.applicationNumber}.pdf`)
  }

  return (
    <React.Fragment>
      {
        <div className={"employee-application-details"} style={{ marginBottom: "24px",alignItems:"center" }}>
            <Header className="works-header-view" styles={{ marginLeft: "0px", paddingTop: "10px" }}>
              {t(`${response?.module.toUpperCase()}_${response?.businessService?.toUpperCase()}_APPLICATION_DETAILS`)}
            </Header>
            <MultiLink onHeadClick={() => setShowOptions(!showOptions)} className="multilink-block-wrapper divToBeHidden" label={t("CS_COMMON_DOWNLOAD")}  displayOptions={showOptions} options={generateDownloadOptions()}/>
        </div>
      }
      <ViewComposer data={config} isLoading={false} />
      <ViewCheckListCards applicationId={data?.Application?.[0]?.id} checkListCodes={checkListCodes}/>
        { <WorkflowActions
          forcedActionPrefix={`WF_${response?.businessService}_ACTION`}
          businessService={queryStrings?.businessService || selectedBusinessService?.code || matchedBusinessServices[0]?.code}
          applicationNo={response?.applicationNumber}
          tenantId={tenantId}
          applicationDetails={response}
          serviceConfig={serviceConfig}
          url={`/public-service/v1/application/${queryStrings?.serviceCode}`}
          isDisabled={!selectedBusinessService}
          moduleCode={response?.module}
          {...(matchedBusinessServices.length > 1 && {
            actionFields: [
              <Button
                t={t}
                type={"actionButton"}
                options={matchedBusinessServices}
                label={"Business Service"}
                variation={"primary"}
                optionsKey={"displayname"}
                isSearchable={false}
                onOptionSelect={(value) => setSelectedBusinessService(value)}
              />,
            ],
          })}
        />}
    </React.Fragment>
  );
};
export default DigitDemoViewComponent;