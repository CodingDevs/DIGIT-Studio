import { AppContainer, PrivateRoute } from "@egovernments/digit-ui-react-components";
import { BreadCrumb } from "@egovernments/digit-ui-components";
import React from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "react-router-dom";
import LandingPage from "./LandingPage";
import Workflow from "./WorkflowPage";
import { CreateChecklist } from "./checklist/CreateChecklist";
import ChecklistHomePage from "./checklist/ChecklistHomePage";
import Roles from "./roles";

const SampleBreadCrumbs = ({ location }) => {
  const { t } = useTranslation();

  const crumbs = [
    {
      internalLink: `/${window?.contextPath}/employee`,
      content: t("HOME"),
      show: true,
    },
    {
      content: t(location.pathname.split("/").pop().toUpperCase()),
      show: true,
    }
  ];
  return <BreadCrumb crumbs={crumbs} />;
};


const App = ({ path, stateCode, userType, tenants }) => {
  const location = window.location;

  return (
    <Switch>
      <AppContainer className="ground-container">
        <React.Fragment>
          <SampleBreadCrumbs location={location} />
        </React.Fragment>
        <PrivateRoute path={`${path}/LandingPage`} component={() => <LandingPage />} />
        <PrivateRoute path={`${path}/Workflow`} component={() => <Workflow />} />
        <PrivateRoute path={`${path}/Checklist`} component={() => <ChecklistHomePage />} />
        <PrivateRoute path={`${path}/create-checklist`} component={() => <CreateChecklist />} />
        <PrivateRoute path={`${path}/Roles`} component={() => <Roles />} />
        <PrivateRoute path={`${path}/update-checklist`} component={() => <CreateChecklist isUpdate={true} />} />
      </AppContainer>
    </Switch>
  );
};

export default App;
