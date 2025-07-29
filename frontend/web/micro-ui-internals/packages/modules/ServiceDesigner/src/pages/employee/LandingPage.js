import React, { useEffect, useState } from "react";
import LandingPageConfig from "../../config/LandingPageConfig";
import axios from "axios";
import {
  Card,
  CardSectionHeader,
  CardText,
  CardHeader,
} from "@egovernments/digit-ui-react-components";
import ServiceCard from "../../components/ServiceCard";
import { Toggle, CustomSVG, Loader, Tab, PopUp, TextInput, Button } from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

export const buildCardData = (drafts = [], published = [], t) => {
  const publishedCards = published.map((item) => ({
    title: item.businessService || item.service || "Unnamed Service",
    description: `Manage ${item.businessService || item.service} services for your citizens`,
    link: "/employee",
  }));

  console.log(drafts,"draftsss");
  const draftCards = drafts.map((item) => ({
    title: item.uniqueIdentifier || "Unnamed Draft Service",
    description: "Service group still in draft mode",
    link: `employee/servicedesigner/Service-Builder-Home?module=${item?.data?.module}&service=${item?.data?.service}&edit=true`,
    createdDate: Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
  }));

  const templates = [
    {
      title: "Property Tax",
      description: "Assessment and payment system for Mumbai Municipal Corporation",
    },
    {
      title: "Water Tax",
      description: "Manage water tax services for your citizens",
    },
  ];

  return {
    Published: [
      {
        title: t("STUDIO_NEW_SERVICE_HEADER"),
        description: t("STUDIO_NEW_SERVICE_DESCRIPTION"),
        isCreateCard: true,
        onClick: true, // Custom flag to indicate this card needs custom click handling
      },
      ...publishedCards,
    ],
    Drafts: draftCards,
    templates,
  };
};

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
  localStorage.removeItem("canvasElements")
  localStorage.removeItem("connections")

  const toggleConfig = LandingPageConfig.find(
    (item) => item.type === "ToggleGroup"
  );
  const [selectedToggle, setSelectedToggle] = useState(
    toggleConfig?.default || ""
  );

  const cardsPerRow = 4;
  const visibleRows = 2;
  const maxCardsToShow = cardsPerRow * visibleRows;

  const handleProceedToServiceBuilder = () => {
    if (!moduleName.trim() || !serviceName.trim()) {
      return;
    }
    
    const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(moduleName.trim())}&service=${encodeURIComponent(serviceName.trim())}`;
    history.push(`/${window.contextPath}/${url}`);
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
                tenantId: tenantId,
                schemaCode: "Studio.ServiceConfigurationDrafts",
                limit: 10,
                offset: 0,
              },
              RequestInfo: {
                apiId: "Rainmaker",
                authToken: window?.localStorage?.getItem("Employee.token"),
                userInfo: { tenantId: tenantId },
              },
            },
            { headers: { "Content-Type": "application/json;charset=UTF-8" } }
          ),
          axios.get("/public-service/v1/service", {
            params: { tenantId },
            headers: {
              "X-Tenant-Id": tenantId,
              "auth-token": window?.localStorage?.getItem("Employee.token"),
            },
          }),
        ]);

        setMdmsData(mdmsResponse.data?.mdms || []);
        setPublicServices(publicServiceResponse.data?.Services?.filter((ob) => ob?.status === "ACTIVE") || []);
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
    const finalCardData = buildCardData(drafts, published, t);
    setCardData(finalCardData);
  }, [publicServices, mdmsData]);

  if (isLoading) return <Loader />;

  return (
    <Card style={{ paddingLeft: "2.5rem" }}>
      {LandingPageConfig.map((item, index) => {
        if (item.type === "SectionHeader") {
          const nextItem = LandingPageConfig[index + 1];
          const isNextToggle = nextItem?.type === "ToggleGroup";

          if (isNextToggle)
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <CardSectionHeader style={{ marginBottom: "unset" }}>
                  {t(item.text)}
                </CardSectionHeader>
                {/* <Tab
                 configNavItems={nextItem?.options}
                 showNav={ nextItem?.options?.length > 0}
                 configItemKey={"i18nKey"}
                 configDisplayKey={"i18nKey"}
                 activeLink={selectedToggle}
                 setActiveLink={(e) => {
                  setSelectedToggle(e)
                 }}
                 style={{ width: "fit-content", marginRight: "1rem" }}
                /> */}
                <Toggle
                  name="toggleOptions"
                  numberOfToggleItems={nextItem?.options?.length}
                  onSelect={(e) => {
                    setSelectedToggle(e);
                    setShowAllCards(false); // reset when toggle changes
                  }}
                  style={{maxWidth:"23.5rem"}}
                  options={nextItem?.options}
                  optionsKey="i18nKey"
                  selectedOption={selectedToggle}
                  type="toggle"
                />
              </div>
            );
          else
            return (
              <CardSectionHeader
                key={index}
                style={{ marginBottom: "unset", marginTop: "1.5rem", marginBottom: "1.5rem" }}
              >
                {t(item.text)}
              </CardSectionHeader>
            );
        }

        if (item.type === "ToggleGroup") {
          return null;
        }

        switch (item.type) {
          case "Header":
            return <CardHeader key={index}>{t(item.text)}</CardHeader>;
          case "SubHeader":
            return <CardText key={index}>{t(item.text)}</CardText>;
          case "CardGroup":
            const cards = cardData[item?.toggleData ? selectedToggle : item?.dataKey] || [];
            const visibleCards = showAllCards ? cards : cards.slice(0, maxCardsToShow);

            return (
              <div key={index}>
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
                            createdDate={card.isCreateCard ? null : card.createdDate || "01/01/2025"}
                            link={card.onClick ? null : card.link}
                            onClick={card.onClick ? handleCreateCardClick : undefined}
                            className={card.isCreateCard ? "create-card" : ""}
                        />
                    ))
                ) : (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                        {t("STUDIO_NO_CARDS_AVAILABLE")} {t(`STUDIO_${selectedToggle.toUpperCase()}`)}
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
          default:
            return null;
        }
      })}
      
      {/* Create Service Group Popup */}
      {showCreatePopup && (
        <PopUp
          header={t("CREATE_SERVICE_GROUP")}
          headerBarMain={t("ENTER_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={() => setShowCreatePopup(false)}
          onClose={() => setShowCreatePopup(false)}
          children={[
            <div key="create-service-form" style={{ 
              padding: "1rem", 
              background: "#f8f9fa", 
              borderRadius: "8px",
              border: "1px solid #e9ecef"
            }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: "1rem",
                  gap: "1rem"
                }}>
                  <label style={{ 
                    minWidth: "120px",
                    fontWeight: "500",
                    color: "#333"
                  }}>
                    {t("MODULE_NAME")}:
                  </label>
                  <TextInput
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    //placeholder={t("ENTER_MODULE_NAME")}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center",
                  gap: "1rem"
                }}>
                  <label style={{ 
                    minWidth: "120px",
                    fontWeight: "500",
                    color: "#333"
                  }}>
                    {t("SERVICE_NAME")}:
                  </label>
                  <TextInput
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    //placeholder={t("ENTER_SERVICE_NAME")}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: "0.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e9ecef"
              }}>
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
              </div>
            </div>
          ]}
        />
      )}
    </Card>
  );
};

export default LandingPage;

