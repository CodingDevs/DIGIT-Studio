import { HRIcon, EmployeeModuleCard, AttendanceIcon, PropertyHouse } from "@egovernments/digit-ui-react-components";
import React from "react";
import { useTranslation } from "react-i18next";

const ServiceDesignerCard = () => {
 
  const { t } = useTranslation();

  //To show the card at main page
  const propsForModuleCard = {
    Icon: "BeenHere",
    moduleName: t("SERVICE_DESIGNER"),
    kpis: [

    ],
    links: [
      {
        label: t("SERVICE_DESIGNER_LANDING"),
        link: `/${window?.contextPath}/employee/servicedesigner/LandingPage`,
      },
      {
        label: t("SERVICE_DESIGNER_WORKFLOW"),
        link: `/${window?.contextPath}/employee/servicedesigner/Workflow`,
      },
      {
        label: t("SERVICE_DESIGNER_CHECKLIST"),
        link: `/${window?.contextPath}/employee/servicedesigner/Checklist`,
      },
    ],
  };

  //employee module card categorization
  return <EmployeeModuleCard {...propsForModuleCard} />;
};

export default ServiceDesignerCard;