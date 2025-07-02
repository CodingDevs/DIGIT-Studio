import React, { useState } from "react";
import LandingPageConfig from "../../config/LandingPageConfig";
import CardData from "../../config/CardData";
import {
  Card,
  CardSectionHeader,
  CardText,
  CardHeader,
} from "@egovernments/digit-ui-react-components";
import ServiceCard from "../../components/ServiceCard";
import { Toggle } from "@egovernments/digit-ui-components";

const LandingPage = () => {
  const toggleConfig = LandingPageConfig.find(
    (item) => item.type === "ToggleGroup"
  );
  const [selectedToggle, setSelectedToggle] = useState(
    toggleConfig?.default || ""
  );

  return (
    <Card style={{paddingLeft:"2.5rem"}}>
      {LandingPageConfig.map((item, index) => {
        if (item.type === "SectionHeader") {
          const nextItem = LandingPageConfig[index + 1];
          const isNextToggle = nextItem?.type === "ToggleGroup";

          if(isNextToggle)
          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <CardSectionHeader style={{marginBottom:"unset"}}>{item.text}</CardSectionHeader>
              {isNextToggle && (
                <Toggle
                    name="toggleOptions"
                    numberOfToggleItems={nextItem?.options?.length}
                    onSelect={(e)=> {
                        setSelectedToggle(e)}}
                    options={nextItem?.options}
                    optionsKey="name"
                    selectedOption={selectedToggle}
                    type="toggle"
                    />
              )}
            </div>
          );
          else
          return(<CardSectionHeader style={{marginBottom:"unset", marginTop:"1.5rem"}}>{item.text}</CardSectionHeader>);
        }

        if (item.type === "ToggleGroup") {
          // Already handled with SectionHeader
          return null;
        }

        switch (item.type) {
          case "Header":
            return <CardHeader key={index}>{item.text}</CardHeader>;
          case "SubHeader":
            return <CardText key={index}>{item.text}</CardText>;
          case "CardGroup":
            return(
                <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  justifyContent: "flex-start",
                  maxWidth: "80%",
                  marginTop: "16px",
                }}
              >
                {(CardData[item?.toggleData ? selectedToggle: item?.dataKey])?.map((card, index) => (
                  <ServiceCard
                    key={index}
                    cardHeader={card.title}
                    cardBody={card.description}
                    createdDate={"1/01/2023"}
                    link={card.link}
                  />
                ))}
              </div>
            )
          default:
            return null;
        }
      })}
    </Card>
  );
};

export default LandingPage;
