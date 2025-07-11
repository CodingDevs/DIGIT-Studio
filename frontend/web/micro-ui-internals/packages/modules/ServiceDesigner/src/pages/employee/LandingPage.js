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
              <Card>
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
              </Card>
            )
          default:
            return null;
        }
      })}
    </Card>
  );
};

export default LandingPage;

// import React, { useState } from "react";
// import LandingPageConfig from "../../config/LandingPageConfig";
// import CardData from "../../config/CardData";
// import {
//   Card,
//   CardSectionHeader,
//   CardText,
//   CardHeader,
// } from "@egovernments/digit-ui-react-components";
// import ServiceCard from "../../components/ServiceCard";
// import { Toggle, Tab } from "@egovernments/digit-ui-components";

// const LandingPage = () => {
//   const toggleConfig = LandingPageConfig.find((item) => item.type === "ToggleGroup");
//   const [selectedToggle, setSelectedToggle] = useState(toggleConfig?.default || "");

//   // Split config into insideCardItems and outsideCardItems
//   const insideCardItems = LandingPageConfig.filter(
//     (item) => item.type !== "SectionHeader" || item.text !== "My Template groups"
//   ).filter((item) => item.type !== "CardGroup" || item.text !== "My Template groups");

//   const templateSectionHeader = LandingPageConfig.find(
//     (item) => item.type === "SectionHeader" && item.text === "My Template groups"
//   );

//   const templateCardGroup = LandingPageConfig.find(
//     (item) => item.type === "CardGroup" && !item.toggleData // Only non-toggleData template cardGroup
//   );

//   return (
//     <React.Fragment>
//       {/* Content inside card */}
//       <Card style={{ paddingLeft: "2.5rem" }}>
//         {insideCardItems.map((item, index) => {
//           if (item.type === "SectionHeader") {
//             const nextItem = insideCardItems[index + 1];
//             const isNextToggle = nextItem?.type === "ToggleGroup";

//             if (isNextToggle)
//               return (
//                 <div
//                   key={index}
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   <CardSectionHeader style={{ marginBottom: "unset" }}>{item.text}</CardSectionHeader>
//                   <Toggle
//                     name="toggleOptions"
//                     numberOfToggleItems={toggleConfig?.options?.length}
//                     onSelect={(e) => setSelectedToggle(e)}
//                     options={toggleConfig?.options}
//                     optionsKey="name"
//                     selectedOption={selectedToggle}
//                     type="toggle"
//                   />
//                 </div>
//               );
//             else return (
//               <CardSectionHeader key={index} style={{ marginBottom: "unset", marginTop: "1.5rem" }}>
//                 {item.text}
//               </CardSectionHeader>
//             );
//           }

//           if (item.type === "ToggleGroup") return null;

//           switch (item.type) {
//             case "Header":
//               return <CardHeader key={index}>{item.text}</CardHeader>;
//             case "SubHeader":
//               return <CardText key={index}>{item.text}</CardText>;
//             case "CardGroup":
//               return (
//                 <div
//                   key={index}
//                   style={{
//                     display: "flex",
//                     flexWrap: "wrap",
//                     gap: "16px",
//                     justifyContent: "flex-start",
//                     maxWidth: "80%",
//                     marginTop: "16px",
//                   }}
//                 >
//                   {(CardData[item?.toggleData ? selectedToggle : item?.dataKey] || []).map((card, i) => (
//                     <ServiceCard
//                       key={i}
//                       cardHeader={card.title}
//                       cardBody={card.description}
//                       createdDate={"1/01/2023"}
//                       link={card.link}
//                     />
//                   ))}
//                 </div>
//               );
//             default:
//               return null;
//           }
//         })}
//       </Card>

//       {/* My Template Groups section rendered outside the Card */}
//       {templateSectionHeader && (
//         <CardSectionHeader style={{ marginTop: "2rem" }}>{templateSectionHeader.text}</CardSectionHeader>
//       )}

//       {templateCardGroup && (
//         <div
//           style={{
//             display: "flex",
//             flexWrap: "wrap",
//             gap: "16px",
//             justifyContent: "flex-start",
//             paddingLeft: "2.5rem",
//             marginTop: "16px",
//           }}
//         >
//           {(CardData[templateCardGroup?.dataKey] || []).map((card, index) => (
//             <ServiceCard
//               key={index}
//               cardHeader={card.title}
//               cardBody={card.description}
//               createdDate={"1/01/2023"}
//               link={card.link}
//             />
//           ))}
//         </div>
//       )}
//     </React.Fragment>
//   );
// };

// export default LandingPage;

