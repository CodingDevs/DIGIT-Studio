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
import AppConfigurationTabLayer from "./formBuilder/AppConfigurationTabLayer";
import FormHomePage from "./formBuilder/FormHomePage";
import ServiceBuilderCard from "../../components/ServiceBuilderCard";
import Notification from "../employee/Notification/Notification";
import CreateNotification from "../employee/Notification/CreateNotification";

const SampleBreadCrumbs = ({ location }) => {
  const { t } = useTranslation();

  const getBreadcrumbContent = (pathname) => {
    const pathSegments = pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Handle specific paths for better breadcrumb display
    switch (lastSegment) {
      case "Service-Builder-Home":
        return t("SERVICE_BUILDER_HOME");
      case "LandingPage":
        return t("CREATE_SERVICE_GROUP");
      case "Workflow":
        return t("WORKFLOW_DESIGNER");
      case "Checklist":
        return t("CHECKLIST_MANAGEMENT");
      case "create-checklist":
        return t("CREATE_CHECKLIST");
      case "update-checklist":
        return t("UPDATE_CHECKLIST");
      case "Roles":
        return t("ROLE_MANAGEMENT");
      case "form-builder":
        return t("FORM_BUILDER");
      case "forms":
        return t("FORM_MANAGEMENT");
      case "notifications":
        return t("FORM_NOTIFICATION");
      case "create-notification":
        return t("CREATE_NOTIFICATION");
      default:
        return t(lastSegment.toUpperCase());
    }
  };

  const getBreadcrumbs = (pathname) => {
    const pathSegments = pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const baseCrumbs = [
      {
        internalLink: `/${window?.contextPath}/employee`,
        content: t("HOME"),
        show: true,
      },
      {
        internalLink: `/${window?.contextPath}/employee/servicedesigner/LandingPage`,
        content: t("SERVICE_DESIGNER"),
        show: true,
      }
    ];

    // Add Service-Builder-Home for specific pages
    if (["Workflow", "Checklist", "create-checklist", "update-checklist", "Roles", "form-builder", "forms","notifications","create-notification"].includes(lastSegment)) {
      baseCrumbs.push({
        externalLink: `/${window?.contextPath}/employee/servicedesigner/Service-Builder-Home?module=${new URLSearchParams(location.search).get("module") || "Studio"}&service=${new URLSearchParams(location.search).get("service") || "Service"}`,
        content: t("SERVICE_BUILDER_HOME"),
        show: true,
      });
    }

    if(["form-builder"].includes(lastSegment)){
      baseCrumbs.push({
        externalLink: `/${window?.contextPath}/employee/servicedesigner/forms?module=${new URLSearchParams(location.search).get("module") || "Studio"}&service=${new URLSearchParams(location.search).get("service") || "Service"}`,
        content: t("FORM_MANAGEMENT"),
        show: true,
      });
    }

    if(["create-checklist","update-checklist"].includes(lastSegment)){
      baseCrumbs.push({
        externalLink: `/${window?.contextPath}/employee/servicedesigner/Checklist?module=${new URLSearchParams(location.search).get("module") || "Studio"}&service=${new URLSearchParams(location.search).get("service") || "Service"}`,
        content: t("CHECKLIST_MANAGEMENT"),
        show: true,
      });
    }

    if(["create-notification"].includes(lastSegment)){
      baseCrumbs.push({
        externalLink: `/${window?.contextPath}/employee/servicedesigner/notifications?module=${new URLSearchParams(location.search).get("module") || "Studio"}&service=${new URLSearchParams(location.search).get("service") || "Service"}`,
        content: t("FORM_NOTIFICATION"),
        show: true,
      });
    }

    // Add current page
    if(lastSegment !== "LandingPage")
    baseCrumbs.push({
      internalLink: `/${window?.contextPath}/employee/servicedesigner/${lastSegment}`,
      content: getBreadcrumbContent(pathname),
      show: true,
    });

    return baseCrumbs;
  };

  const crumbs = getBreadcrumbs(location.pathname);
  return <BreadCrumb crumbs={crumbs} />;
};


const App = ({ path, stateCode, userType, tenants }) => {
  const location = window.location;

  return (
    <Switch>
      <AppContainer className="ground-container" style={{padding:"0px", marginLeft:"-0.5rem"}}>
        <React.Fragment>
          <SampleBreadCrumbs location={location} />
        </React.Fragment>
        <PrivateRoute path={`${path}/LandingPage`} component={() => <LandingPage />} />
        <PrivateRoute path={`${path}/Workflow`} component={() => <Workflow />} />
        <PrivateRoute path={`${path}/Checklist`} component={() => <ChecklistHomePage />} />
        <PrivateRoute path={`${path}/create-checklist`} component={() => <CreateChecklist />} />
        <PrivateRoute path={`${path}/Roles`} component={() => <Roles />} />
        <PrivateRoute path={`${path}/update-checklist`} component={() => <CreateChecklist isUpdate={true} />} />
        <PrivateRoute path={`${path}/form-builder`} component={() => <AppConfigurationTabLayer />} />
        <PrivateRoute path={`${path}/forms`} component={() => <FormHomePage />} />
        <PrivateRoute path={`${path}/Service-Builder-Home`} component={() => <ServiceBuilderCard />} />
        <PrivateRoute path={`${path}/notifications`} component={() => <Notification />} />
        <PrivateRoute path={`${path}/create-notification`} component={() => <CreateNotification />} />
      </AppContainer>
    </Switch>
  );
};

export default App;
