import { Loader } from "@egovernments/digit-ui-components";
import React, { useEffect, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import { default as EmployeeApp } from "./pages/employee";
import PublicServicesCard from "./components/PublicServicesCard";
import { updateCustomConfigs } from "./utils";
import axios from "axios";

export const PublicServicesModule = ({ stateCode, userType, tenants }) => {
  const { path } = useRouteMatch();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const language = Digit.StoreData.getCurrentLanguage();

  const [serviceData, setServiceData] = useState(null);
  const [moduleListLoading, setModuleListLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        setModuleListLoading(true);
        const response = await axios.get("/public-service/v1/service", {
          params: { tenantId },
          headers: {
            "X-Tenant-Id": tenantId,
            "auth-token": window?.localStorage?.getItem("Employee.token"),
          },
        });
        setServiceData(response.data);
      } catch (err) {
        console.error("API fetch error:", err);
        setApiError(err);
      } finally {
        setModuleListLoading(false);
      }
    };

    fetchServiceData();
  }, [tenantId]);

  const moduleList = [...new Set(serviceData?.Services?.map((ob) => ob?.module))] || [];
  let moduleCode = ["sample", "common", "workflow", "digit-boundary-admin", "digit-boundary-NEWTEST00222"];
  moduleList.forEach((ob) => moduleCode.push(`studio-${ob}`));
  moduleCode.push("studio-newtl-checklist");

  const { isLoading: storeLoading, data: store } = Digit.Services.useStore({
    stateCode,
    moduleCode,
    language,
  });

  if (storeLoading || moduleListLoading) {
    return <Loader page={true} variant={"PageLoader"} />;
  }

  if (apiError) {
    return <div>Error loading services: {apiError.message}</div>;
  }

  return <EmployeeApp path={path} stateCode={stateCode} userType={userType} tenants={tenants} />;
};

const componentsToRegister = {
  PublicServicesModule,
  PublicServicesCard,
};

export const initPublicServiceComponents = () => {
  updateCustomConfigs();
  Object.entries(componentsToRegister).forEach(([key, value]) => {
    Digit.ComponentRegistryService.setComponent(key, value);
  });
};
