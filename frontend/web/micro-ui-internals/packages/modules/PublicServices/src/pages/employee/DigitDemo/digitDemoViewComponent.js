import { Header, SubmitBar, Menu, Card, Loader, ViewComposer, MultiLink } from "@egovernments/digit-ui-react-components";
import { Button } from "@egovernments/digit-ui-components";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { generateViewConfigFromResponse } from "../../../utils";
import WorkflowActions from "../../../components/WorkflowActions";
import ViewCheckListCards from "../CheckList/viewCheckListCards";
import { useWorkflowDetailsWorks, processBusinessServices } from "../../../utils";
const DigitDemoViewComponent = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const [selectedBusinessService, setSelectedBusinessService] = useState(null);
  const userInfo = Digit.UserService.getUser();
  const { module, service } = useParams();
  const userRoles = userInfo?.info?.roles?.map((roleData) => roleData?.code);
  const [current, setCurrent] = useState(Date.now());
  const [matchedBusinessServices, setMatchedBusinessServices] = useState([]);
  const queryStrings = Digit.Hooks.useQueryParams();
  const request = {
    url : `/public-service/v1/application/${queryStrings?.serviceCode|| "SVC-DEV-TRADELICENSE-NEWTL-04"}`,
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

  const requestCriteria = {
    url: "/egov-mdms-service/v2/_search",
    body: {
      MdmsCriteria: {
        tenantId: tenantId,
        schemaCode: "Studio.ServiceConfiguration",
      },
    },
  };

  const { isLoading: ServiceConfigLoading, data: serviceConfigData } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  const serviceConfig = serviceConfigData?.mdms?.find((item) =>
    item?.uniqueIdentifier.toLowerCase() === `${module}.${service}`.toLowerCase()
  );

  let {data :workflowDetails, isLoading: workflowLoading} = useWorkflowDetailsWorks(
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

  let config = generateViewConfigFromResponse(response,t, queryStrings?.businessService, serviceConfig);

useEffect(() => {
  // Guard clause to avoid calling with missing inputs
  if (!serviceConfig || !tenantId || !queryStrings?.applicationNumber || !workflowDetails) return;

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

useEffect(() => {
  if (matchedBusinessServices.length === 1 && !selectedBusinessService) {
    setSelectedBusinessService(matchedBusinessServices[0]);
  }
}, [matchedBusinessServices, selectedBusinessService]);
  let checkListCodes = workflowDetails ? [`${response?.businessService}.${workflowDetails?.processInstances[0].state?.state}`] : [];
  if (isLoading || workflowLoading || ServiceConfigLoading) {
    return <Loader />;
  }

  return (
    <React.Fragment>
      {
        <div className={"employee-application-details"} style={{ marginBottom: "24px" }}>
          {
            <Header className="works-header-view" styles={{ marginLeft: "0px", paddingTop: "10px" }}>
              {t(`${response?.module.toUpperCase()}_${response?.businessService?.toUpperCase()}_APPLICATION_DETAILS`)}
            </Header>
          }
        </div>
      }
      <ViewComposer data={config} isLoading={false} />
      <ViewCheckListCards applicationId={data?.Application?.[0]?.id} checkListCodes={checkListCodes} />
        { <WorkflowActions
          forcedActionPrefix={`WF_${response?.businessService}_ACTION`}
          businessService={selectedBusinessService?.code || matchedBusinessServices[0]?.code}
          applicationNo={response?.applicationNumber}
          tenantId={tenantId}
          applicationDetails={response}
          url={`/public-service/v1/application/SVC-DEV-TRADELICENSE-NEWTL-04`}
          //setStateChanged={setStateChanged}
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
      {/* <ActionBar>
        {displayMenu ? <Menu localeKeyPrefix={"WORKS"} options={actionULB} optionKey={"name"} t={t} onSelect={onActionSelect} /> : null}
        <SubmitBar label={t("ACTIONS")} onSubmit={() => setDisplayMenu(!displayMenu)} />
      </ActionBar> */}
    </React.Fragment>
  );
};
export default DigitDemoViewComponent;