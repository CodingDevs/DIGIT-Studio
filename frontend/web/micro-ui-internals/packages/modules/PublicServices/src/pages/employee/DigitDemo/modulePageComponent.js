import React from "react";
import { Card, LandingPageCard, Button, HeaderComponent, CardText, Loader, SubmitBar } from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { transformResponseforModulePage } from "../../../utils";

const ModulePageComponent = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const tenantId = Digit.ULBService.getCurrentTenantId();
  const queryStrings = Digit.Hooks.useQueryParams();
  localStorage.removeItem("formData");
  localStorage.removeItem("currentStep");
  sessionStorage.removeItem("formData");

  //To fetch the service details configured for the tenant
  const request = {
    url : "/public-service/v1/service",
    params: { tenantId : tenantId},
    headers: {
      "X-Tenant-Id" : tenantId,
      "auth-token" : window?.localStorage?.getItem("Employee.token"),
    },
    method: "GET",
  }
  const {isLoading, data} = Digit.Hooks.useCustomAPIHook(request);

  //  util to transform raw data into UI-friendly structure
  let detailsConfig = data ? transformResponseforModulePage(data?.Services) : [];
  const hasNoData = detailsConfig.length === 0 && !isLoading;

  if (isLoading) {
    return <Loader />;
  }

  // Show fallback UI when no data is available
  if (hasNoData) { 
    return ( 
    <div className="products-container"> 
    <HeaderComponent className="products-title">{t("DIGIT_STUDIO_HEADER")}</HeaderComponent> 
    <CardText>{t("NO_SERVICES_AVAILABLE")}</CardText> 
    </div> ); 
    }

  return (
    <div className="products-container">
      {/* Header Section */}
      <HeaderComponent className="products-title">{t("DIGIT_STUDIO_HEADER")}</HeaderComponent>
      <CardText className="products-description">
        {t("DIGIT_STUDIO_HEADER_DESCRIPTION")}
      </CardText>

      {/* Product Cards Section */}
      <div className="products-list">
        {detailsConfig?.map((product, index) => {
          const links = queryStrings?.selectedPath === "Apply" && product?.businessServices.map((bs) => ({
                  label: bs.businessService,
                  link: `/${window.contextPath}/employee/publicservices/${product.module}/${bs.businessService}/Apply?serviceCode=${bs?.serviceCode}`,
          }));
          return (
            <LandingPageCard
              key={index}
              className={"module-page-card"}
              moduleName={t(product.heading)}
              metrics={[
                {
                  label: t(product?.cardDescription),
                },
              ]}
              links={links}
              centreChildren={[
                <Button
                  variation="teritiary"
                  label={t(`${product?.module?.toUpperCase()}_HOW_IT_WORKS`)}
                  type="button"
                  size={"medium"}
                  onClick={() => {
                    history.push({
                      pathname: `/${window.contextPath}/employee`
                    });
                  }}
                />
              ]}
              endChildren={[
                <Button
                  variation="teritiary"
                  type="button"
                  size={"medium"}
                  onClick={() => {
                    history.push({
                      pathname: `/${window.contextPath}/employee/publicservices/${product.module}/search`,
                      state: {
                        moduleData:data // example
                      }
                    });
                  }}
                  label={t(`${product?.module?.toUpperCase()}_SEARCH`)}
                />,
                <Button
                  variation="teritiary"
                  type="button"
                  size={"medium"}
                  onClick={() => {
                    history.push({
                      pathname: `/${window.contextPath}/employee/publicservices/${product.module}/Inbox`
                    });
                  }}
                  label={t(`${product?.module?.toUpperCase()}_INBOX`)}
                />
              ]}
              hideHeaderDivider={true}
              style={{}}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ModulePageComponent;