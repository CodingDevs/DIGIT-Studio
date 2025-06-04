import { HRIcon, EmployeeModuleCard, AttendanceIcon, PropertyHouse } from "@egovernments/digit-ui-react-components";
import React from "react";
import { useTranslation } from "react-i18next";

const PublicServicesCard = () => {
 
  const { t } = useTranslation();

  //To show the card at main page
  const propsForModuleCard = {
    Icon: "BeenHere",
    moduleName: t("DIGIT_STUDIO"),
    kpis: [

    ],
    links: [
      {
        label: t("DIGIT_STUDIO_APPLY"),
        link: `/${window?.contextPath}/employee/publicservices/modules?selectedPath=Apply`,
      },
    ],
  };

  //employee module card categorization
  return <EmployeeModuleCard {...propsForModuleCard} />;
};

export default PublicServicesCard;