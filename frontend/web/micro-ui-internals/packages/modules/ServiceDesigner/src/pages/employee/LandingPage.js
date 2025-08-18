import React, { useEffect, useState, useRef } from "react";
import LandingPageConfig from "../../config/LandingPageConfig";
import axios from "axios";
import {
  Card,
  CardSectionHeader,
  CardText,
  CardHeader,
} from "@egovernments/digit-ui-react-components";
import ServiceCard from "../../components/ServiceCard";
import {
  Toggle,
  CustomSVG,
  Loader,
  PopUp,
  TextInput,
  Button,
  TextBlock,
  TextArea,
} from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useServiceConfigAPI } from "../../hooks/useServiceConfigAPI";

// Utility to build card data
export const buildCardData = (drafts = [], published = [], t) => {
  console.log(published,drafts);
  const publishedCards = published.map((item) => ({
    title: `${item?.module} ${item.businessService}` || item.service || "Unnamed Service",
    description: `Manage ${item.businessService || item.service} services for your citizens`,
    link: "/employee",
    module: item?.module,
    service: item?.businessService || item?.service,
  }));

  const draftCards = drafts.map((item) => ({
    title: item.uniqueIdentifier || "Unnamed Draft Service",
    description: "Service group still in draft mode",
    link: `employee/servicedesigner/Service-Builder-Home?module=${item?.data?.module}&service=${item?.data?.service}&edit=true`,
    createdDate:
      Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
    module: item?.data?.module,
    service: item?.data?.service,
  }));

  const templates = [
    {
      title: "Property Tax",
      description: "Assessment and payment system for Mumbai Municipal Corporation",
      module: "PROPERTY_TAX",
      service: "PROPERTY_TAX",
    },
    {
      title: "Water Tax",
      description: "Manage water tax services for your citizens",
      module: "WATER_TAX",
      service: "WATER_TAX",
    },
  ];

  return {
    Published: [
      {
        title: t("STUDIO_NEW_SERVICE_HEADER"),
        description: t("STUDIO_NEW_SERVICE_DESCRIPTION"),
        isCreateCard: true,
        onClick: true,
        module: null,
        service: null,
      },
      ...publishedCards,
    ],
    Drafts: draftCards,
    templates: templates,
  };
};

// Utility to split drafts and published
export const extractDraftsAndPublished = (mdmsData = [], serviceData = []) => {
  const serviceIdentifiers = serviceData.map(
    (item) => `${item.module}.${item.businessService}`
  );

  const drafts = mdmsData.filter(
    (item) => !serviceIdentifiers.includes(item?.uniqueIdentifier)
  );

  const uniqueModules = [];
  const modulesSet = new Set();

  serviceData.forEach((item) => {
    if (!modulesSet.has(item.module)) {
      modulesSet.add(item.module);
      uniqueModules.push(item);
    }
  });

  const published = uniqueModules;
  return { drafts, published };
};

const LandingPage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const tenantId = Digit.ULBService.getCurrentTenantId();

  const [isLoading, setIsLoading] = useState(true);
  const [mdmsData, setMdmsData] = useState([]);
  const [publicServices, setPublicServices] = useState([]);
  const [cardData, setCardData] = useState({});
  const [showAllCards, setShowAllCards] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importData, setImportData] = useState("");
  const [importModuleName, setImportModuleName] = useState("");
  const [importServiceName, setImportServiceName] = useState("");

  const [selectedToggle, setSelectedToggle] = useState(
    LandingPageConfig.find((item) => item.type === "ToggleGroup")?.default || ""
  );

  const containerRef = useRef(null);
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const visibleRows = 2;
  const [maxCardsToShow, setMaxCardsToShow] = useState(8); // default fallback

  localStorage.removeItem("canvasElements");
  localStorage.removeItem("connections");

  useEffect(() => {
    const calculateCardsPerRow = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 250; // adjust if your cards differ
      const gap = 16;

      const calculated = Math.floor((containerWidth + gap) / (cardWidth + gap));
      const newCardsPerRow = Math.max(1, calculated);

      setCardsPerRow(newCardsPerRow);
      setMaxCardsToShow(newCardsPerRow * visibleRows);
    };

    calculateCardsPerRow();

    window.addEventListener("resize", calculateCardsPerRow);
    return () => window.removeEventListener("resize", calculateCardsPerRow);
  }, []);

  // Service configuration API hooks
  const { saveServiceConfig } = useServiceConfigAPI();

  const handleProceedToServiceBuilder = async () => {
    if (!moduleName.trim() || !serviceName.trim()) return;
  
    const sanitizedModule = moduleName.trim().replace(/\s+/g, "_");
    const sanitizedService = serviceName.trim().replace(/\s+/g, "_");
  
    try {
      // Create Studio.ServiceConfigurationDrafts entry with empty values
      const emptyServiceConfig = {
        module: sanitizedModule,
        service: sanitizedService,
        pdf: [],
        bill: {},
        idgen: [],
        inbox: {},
        rules: {},
        access: {},
        fields: [],
        enabled: [],
        payment: {},
        uiforms: [],
        uiroles: [],
        boundary: {},
        workflow: {},
        apiconfig: [],
        applicant: {},
        documents: [],
        calculator: {},
        uiworkflow: {},
        localization: {},
        notification: {},
        uichecklists: [],
        uinotifications: []
      };

      await saveServiceConfig.mutateAsync(emptyServiceConfig);

      console.log("Draft created successfully");
      
      // Close the popup
      setShowCreatePopup(false);
      setModuleName("");
      setServiceName("");
      
      // Navigate to service builder
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedModule
      )}&service=${encodeURIComponent(sanitizedService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
      
    } catch (error) {
      console.error("Error creating draft:", error);
      // You might want to show an error message to the user here
      // For now, we'll still navigate even if the draft creation fails
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedModule
      )}&service=${encodeURIComponent(sanitizedService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
    }
  };

  const handleImportService = () => {
    if (!importModuleName.trim() || !importServiceName.trim() || !importData.trim()) return;
  
    const sanitizedModule = importModuleName.trim().replace(/\s+/g, "_");
    const sanitizedService = importServiceName.trim().replace(/\s+/g, "_");
  
    // Parse the JSON data to extract module and service
    try {
      const parsedData = JSON.parse(importData);
      const extractedModule = parsedData.module || parsedData.Module || parsedData.MODULE;
      const extractedService = parsedData.service || parsedData.Service || parsedData.SERVICE;
      
      console.log("Extracted from JSON - Module:", extractedModule);
      console.log("Extracted from JSON - Service:", extractedService);
      console.log("New Module Name:", sanitizedModule);
      console.log("New Service Name:", sanitizedService);
      
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  
    // Here you can add logic to process the import data
    // For now, we'll just navigate to the service builder with the imported data
    // const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
    //   sanitizedModule
    // )}&service=${encodeURIComponent(sanitizedService)}&import=true`;
  
    // history.push(`/${window.contextPath}/${url}`);
    // setShowImportPopup(false);
    // setImportData("");
    // setImportModuleName("");
    // setImportServiceName("");
  };

  const handleCloseImportPopup = () => {
    setShowImportPopup(false);
    setImportData("");
    setImportModuleName("");
    setImportServiceName("");
  };
  const handleCreateCardClick = () => {
    setShowCreatePopup(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mdmsResponse, publicServiceResponse] = await Promise.all([
          axios.post(
            "/egov-mdms-service/v2/_search",
            {
              MdmsCriteria: {
                tenantId,
                schemaCode: "Studio.ServiceConfigurationDrafts",
                limit: 10,
                offset: 0,
              },
              RequestInfo: {
                apiId: "Rainmaker",
                authToken: localStorage.getItem("Employee.token"),
                userInfo: { tenantId },
              },
            },
            { headers: { "Content-Type": "application/json;charset=UTF-8" } }
          ),
          axios.get("/public-service/v1/service", {
            params: { tenantId },
            headers: {
              "X-Tenant-Id": tenantId,
              "auth-token": localStorage.getItem("Employee.token"),
            },
          }),
        ]);

        setMdmsData(mdmsResponse.data?.mdms || []);
        setPublicServices(
          publicServiceResponse.data?.Services?.filter((ob) => ob?.status === "ACTIVE") || []
        );
      } catch (error) {
        console.error("API Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const { drafts, published } = extractDraftsAndPublished(mdmsData, publicServices);
    setCardData(buildCardData(drafts, published, t));
  }, [publicServices, mdmsData]);

  if (isLoading) return <Loader />;

  return (
    <Card style={{ paddingLeft: "2.5rem" }}>
      {LandingPageConfig.map((item, index) => {
        if (item.type === "SectionHeader") {
          const nextItem = LandingPageConfig[index + 1];
          const isNextToggle = nextItem?.type === "ToggleGroup";

          return (
            <div>
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                marginTop:"1.5rem"
              }}
            >
              <CardSectionHeader style={{ marginBottom: "unset" }}>
                {t(item.text)}
              </CardSectionHeader>
             {isNextToggle && <Button style={{marginRight:"3rem"}} label={t("Import")} onClick={() => setShowImportPopup(true)} />}
            </div>
             {isNextToggle && (
              <Toggle
                name="toggleOptions"
                numberOfToggleItems={nextItem?.options?.length}
                onSelect={(e) => {
                  setSelectedToggle(e);
                  setShowAllCards(false);
                }}
                style={{ maxWidth: "23.5rem" }}
                options={nextItem?.options}
                optionsKey="i18nKey"
                selectedOption={selectedToggle}
                type="toggle"
              />
            )}
            </div>
          );
        }

        if (item.type === "ToggleGroup") return null;

        if (item.type === "Header") {
          return <CardHeader key={index}>{t(item.text)}</CardHeader>;
        }

        if (item.type === "SubHeader") {
          return <CardText key={index}>{t(item.text)}</CardText>;
        }

        if (item.type === "CardGroup") {
          const cards = cardData[item?.toggleData ? selectedToggle : item?.dataKey] || [];
          const visibleCards = showAllCards ? cards : cards.slice(0, maxCardsToShow);

          return (
            <div key={index} ref={containerRef}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  justifyContent: "flex-start",
                  maxWidth: "100%",
                  marginTop: "16px",
                }}
              >
                {visibleCards.length > 0 ? (
                  visibleCards.map((card, cardIndex) => (
                    <ServiceCard
                      key={cardIndex}
                      icon={
                        card.isCreateCard ? (
                          <CustomSVG.AddIcon height="35" width="35" />
                        ) : (
                          card?.icon
                        )
                      }
                      cardHeader={card.title || (card.isCreateCard && "Add New")}
                      cardBody={card.isCreateCard ? "" : card.description}
                      createdDate={
                        card.isCreateCard ? null : card.createdDate || "01/01/2025"
                      }
                      link={card.onClick ? null : card.link}
                      onClick={card.onClick ? handleCreateCardClick : undefined}
                      className={card.isCreateCard ? "create-card" : ""}
                      module={card.module}
                      service={card.service}
                    />
                  ))
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                    {t("STUDIO_NO_CARDS_AVAILABLE")}{" "}
                    {t(`STUDIO_${selectedToggle.toUpperCase()}`)}
                  </div>
                )}
              </div>

              {cards.length > maxCardsToShow && (
                <div style={{ width: "80%", textAlign: "center", marginTop: "1rem" }}>
                  <span
                    onClick={() => setShowAllCards((prev) => !prev)}
                    style={{
                      color: "#c84c0e",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    {showAllCards ? t("STUDIO_VIEW_LESS") : t("STUDIO_VIEW_MORE")}
                  </span>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      {showCreatePopup && (
        <PopUp
          header={t("CREATE_SERVICE_GROUP")}
          headerBarMain={t("ENTER_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={() => setShowCreatePopup(false)}
          onClose={() => setShowCreatePopup(false)}
          children={[
            <div>
              <TextBlock
                header={t("CREATE_NEW_SERVICE_HEADER")}
                subHeader={t("CREATE_NEW_SERVICE_SUB_HEADER")}
                subHeaderClasName="header-popup"
                className="typography heading-m"
              />
              <div style={{ marginTop: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("MODULE_NAME")}
                  </label>
                  <TextInput
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("SERVICE_NAME")}
                  </label>
                  <TextInput
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>,
          ]}
          footerChildren={[
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                variation="secondary"
                label={t("CANCEL")}
                onClick={() => setShowCreatePopup(false)}
              />
              <Button
                variation="primary"
                label={t("PROCEED")}
                onClick={handleProceedToServiceBuilder}
                disabled={!moduleName.trim() || !serviceName.trim()}
              />
            </div>,
          ]}
        />
      )}

      {showImportPopup && (
        <PopUp
          header={t("IMPORT_SERVICE_GROUP")}
          headerBarMain={t("IMPORT_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={handleCloseImportPopup}
          onClose={handleCloseImportPopup}
          children={[
            <div>
              <TextBlock
                header={t("IMPORT_NEW_SERVICE_HEADER")}
                subHeader={t("IMPORT_NEW_SERVICE_SUB_HEADER")}
                subHeaderClasName="header-popup"
                className="typography heading-m"
              />
              <div style={{ marginTop: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <label style={{ fontWeight: "500", color: "#333", minWidth: "200px" }}>
                    {t("IMPORT_DATA")}
                  </label>
                  <TextArea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder={t("PASTE_YOUR_SERVICE_CONFIGURATION_JSON_HERE")}
                    style={{ 
                      minHeight: "200px",
                      resize: "vertical",
                      fontFamily: "monospace",
                      fontSize: "12px"
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("IMPORTMODULE_NAME")}
                  </label>
                  <TextInput
                    value={importModuleName}
                    onChange={(e) => setImportModuleName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("IMPORT_SERVICE_NAME")}
                  </label>
                  <TextInput
                    value={importServiceName}
                    onChange={(e) => setImportServiceName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>,
          ]}
          footerChildren={[
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                variation="secondary"
                label={t("CANCEL")}
                onClick={handleCloseImportPopup}
              />
              <Button
                variation="primary"
                label={t("IMPORT")}
                onClick={handleImportService}
                disabled={!importModuleName.trim() || !importServiceName.trim() || !importData.trim()}
              />
            </div>,
          ]}
        />
      )}
    </Card>
  );
};

export default LandingPage;
