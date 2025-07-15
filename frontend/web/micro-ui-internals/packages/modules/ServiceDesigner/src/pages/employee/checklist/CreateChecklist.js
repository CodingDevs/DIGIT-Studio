import React, { useEffect, useState } from "react";
import { SummaryCardFieldPair, Toast, Card, Button, PopUp, TextInput, Loader } from "@egovernments/digit-ui-components";
import { FormComposerV2 } from "@egovernments/digit-ui-react-components";
import { useHistory } from "react-router-dom";
import { checklistCreateConfig } from "../../../config/checklistCreateConfig";
import { useTranslation } from "react-i18next";
import useCreateChecklist from "../../../hooks/useCreateChecklist";
import MobileChecklist from "../../../components/MobileChecklist";
import LocalisationEditorPopup from "../../../components/LocalisationEditorPopup";
import useUpsertLocalisation from "../../../hooks/useUpsertLocalisation";
import useCreateMdmsChecklist from "../../../hooks/useCreateMdmsChecklist";

let temp_data = []

const CreateChecklist = ({isUpdate}) => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const searchParams = new URLSearchParams(location.search);
  const [showToast, setShowToast] = useState(null);
  //const checklistType = searchParams.get("checklistType") || "STUDIO";
  const checklistModule = searchParams.get("module") || "Studio";
  const checklistService = searchParams.get("service") || "Service";
  const checklistSearchName = searchParams.get("checklistName") || "Service";
  //let clt = searchParams.get("checklistType") || "STUDIO";
  let clt = searchParams.get("module") || "STUDIO";
  //const checklistTypeLocal = (!clt?.startsWith("STUDIO_CHECKLIST_TYPE_")) ? "STUDIO_CHECKLIST_TYPE_" + clt : clt;
  const checklistTypeLocal=`${checklistModule.toUpperCase()}_${checklistService.toUpperCase()}`;
  const clTranslated = t(`${checklistTypeLocal}`);
  //const projectName = searchParams.get("campaignName");
  //const projectType = searchParams.get("projectType");
  //const campaignId = searchParams.get("campaignId");
  const [checklistTypeCode, setChecklistTypeCode] = useState(null);
  //const [roleCode, setRoleCode] = useState(null);
  //const flow = searchParams.get("flow");
  const role = searchParams.get("role") || "STUDIO_ADMIN";
  const rlt = searchParams.get("role") || "STUDIO_ADMIN";
  const roleLocal = (!rlt.startsWith("ACCESSCONTROL_ROLES_ROLES_")) ? "ACCESSCONTROL_ROLES_ROLES_" + rlt : rlt;
  const rlTranslated = t(`${roleLocal}`);
  const campaignName = searchParams.get("campaignName");
  const campaignNumber = searchParams.get("campaignNumber");
  let module = searchParams.get("module");
  const [showPopUp, setShowPopUp] = useState(false);
  const [tempFormData, setTempFormData] = useState([]);
  const [config, setConfig] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading_new, setLoading_New] = useState(false);
  const [initialChecklistData, setInitialChecklistData] = useState({});
  let locale = Digit?.SessionStorage.get("initData")?.selectedLanguage || "en_IN";
  const { mutateAsync } = useCreateChecklist(tenantId);
  const { mutateAsync: mdmsMutateAsync } = useCreateMdmsChecklist(tenantId,isUpdate);
  const history = useHistory();
  const [serviceCode, setServiceCode] = useState(null);
  const [def_data, setDef_Data] = useState(null);
  const [helpText, setHelpText] = useState("");

  const [showLocalisationPopup, setShowLocalisationPopup] = useState(false);
  const [localisationData, setLocalisationData] = useState([]);
  const { data: storeData, isLoading } = Digit.Hooks.useStore.getInitData();
  const { languages, stateInfo } = storeData || {};
  const currentLocales = languages?.map(locale => locale.value);
  const [checklistName, setChecklistName] = useState();


  const presentLocale = Digit?.SessionStorage.get("locale") || locale;
  module = `studio-${checklistService}-checklist`;
  const { mutateAsync: localisationMutateAsync } = useUpsertLocalisation(tenantId, module, locale);

  let processedData = [];

  useEffect(() => {
    //setServiceCode(`${campaignName}.${checklistType}.${role}`)
    setServiceCode(`${checklistModule.toUpperCase()}.${checklistService.toUpperCase()}`);
  }, [])

  const mdms_context_path = window?.globalConfigs?.getConfig("MDMS_V2_CONTEXT_PATH") || "mdms-v2";


useEffect(() => {
  //default data
  const formatted_data = [
    {
      id: "2d4a7b1e-1f2f-4a8a-9672-43396c6c9a1c",
      key: 1,
      type: { code: "SingleValueList" },
      level: 1,
      title: t("STUDIO_FIRST_QUES_HELP_TEXT"),
      value: null,
      options: [
        {
          id: "0cff9846-03a2-4453-bf0e-200cdda5f390",
          key: 1,
          label: t("STUDIO_FIRST_OPTION_HELP_TEXT"),
          optionComment: false,
          optionDependency: false,
          parentQuestionId: "2d4a7b1e-1f2f-4a8a-9672-43396c6c9a1c",
        }
      ],
      isActive: true,
      parentId: null,
      isRequired: false,
    },
  ];

  const callSearch = async () => {
    const res = await Digit.CustomService.getResponse({
      url: `/${mdms_context_path}/v2/_search`,
      params: { tenantId: tenantId },
      body: {
        MdmsCriteria: {
          tenantId: tenantId,
          schemaCode: `Studio.Checklists`,
          filters: { name: checklistSearchName },
          isActive: true,
        },
      },
    });
    return res;
  };

  const fetchData = async () => {
    try {
      const res = await callSearch();
      if (res?.mdms?.[0]?.data?.data) {
        setLoading_New(false);
        let temp_data = res.mdms[0].data.data;
        setInitialChecklistData(res.mdms[0]);
        setChecklistName(res?.mdms[0]?.data?.name || "")
        setHelpText(res?.mdms[0]?.data?.description || "");
        setDef_Data(temp_data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  if (isUpdate) {
    fetchData();
  } else {
    setDef_Data(formatted_data);
  }
}, [isUpdate, tenantId, checklistSearchName]);


  useEffect(() => {

    const currentTime = new Date();
    if (def_data !== null) {
      setConfig(checklistCreateConfig(def_data, currentTime, "create"));
    }

  }, [def_data])

  const closeToast = () => {
    setShowToast(null);
  };

  useEffect(() => {
    if (showToast) {
      setTimeout(closeToast, 5000);
    }
  }, [showToast]);

  const popShow = () => {
    const pr = organizeQuestions(tempFormData);
    setPreviewData(pr);
    setShowPopUp(true);
  };

  const clearData = () => {
    const currentTime = new Date();
    const newId = crypto.randomUUID();
    // localStorage.removeItem("questions");
    const cleared_data = [{
      id: newId,
      parentId: null,
      level: 1,
      key: 1,
      title: null,
      type: { "code": "SingleValueList" },
      value: null,
      isRequired: true,
      isActive: true,
      options: [{
        id: crypto.randomUUID(),
        key: 1,
        parentQuestionId: newId,
        label: `${t("STUDIO_CHECKLIST_OPTION")} 1`,
        optionDependency: false,
        optionComment: false,
      }]
    }];
    // const cleared_data = [{ id: crypto.randomUUID(), parentId: null, level: 1, key: 1, title: null, type: { "code": "SingleValueList" }, value: null, isRequired: false }];
    setConfig(checklistCreateConfig(cleared_data, currentTime, "clear"));
  }

  //const { defaultData, setDefaultData } = data_hook();

  const useTemplateData = () => {
    const currentTime = new Date();
    setConfig(checklistCreateConfig(mdms, currentTime));
  }


  const onFormValueChange = (ll, formData) => {
    setTempFormData(formData?.createQuestion?.questionData);
  };

  function organizeQuestions(questions) {
    // Deep clone the questions to avoid mutating the original tempFormData
    const clonedQuestions = JSON.parse(JSON.stringify(questions));

    const questionMap = new Map();
    const optionMap = new Map();
    const organizedQuestions = [];

    // First pass: Populate the maps with questions and options
    clonedQuestions.forEach((question) => {
      question.subQuestions = []; // Initialize an array to hold sub-questions
      questionMap.set(question.id, question);

      if (question?.options) {
        question.options.forEach((option) => {
          option.subQuestions = []; // Initialize an array to hold sub-questions for options
          optionMap.set(option.id, option);
        });
      }
    });

    // Second pass: Link each question to its parent, whether it's a question or an option
    clonedQuestions.forEach((question) => {
      if (question.parentId) {
        const parentQuestion = questionMap.get(question.parentId);
        const parentOption = optionMap.get(question.parentId);

        if (parentQuestion) {
          parentQuestion.subQuestions.push(question);
        } else if (parentOption) {
          parentOption.subQuestions.push(question);
        }
      } else {
        organizedQuestions.push(question);
      }
    });

    return organizedQuestions;
  }

  const LocalisationCodeUpdate =(temp)=>{
    return temp.toUpperCase().replace(/ /g, "_");
  }

  const generateCodes = (questions) => {
    const codes = {};
    const local = [];
    let activeCounters = { top: 0 }; // Track active question counts at each level

    // Precompute common values once
    let checklistTypeTemp = LocalisationCodeUpdate(checklistModule);
    if (checklistTypeCode) checklistTypeTemp = checklistTypeCode;
    // let roleTemp =  LocalisationCodeUpdate(role);
    // let helpTextCode =  LocalisationCodeUpdate(helpText);

    // Add the new static entries to localization data
    // local.push(
    //   {
    //     code: `${campaignName}.${checklistTypeTemp}.${roleTemp}`,
    //     locale: locale,
    //     message: `${t(checklistTypeLocal)} ${t(roleLocal)}`,
    //     module: "hcm-checklist"
    //   },
    //   {
    //     code: `${campaignName}.${checklistTypeTemp}.${roleTemp}.${helpTextCode}`,
    //     locale: locale,
    //     message: helpText || "",
    //     module: "hcm-checklist"
    //   }
    // );

    // Helper function to generate codes recursively
    const generateCode = (question, prefix, index, parentCounter = '') => {
      // Generate code regardless of isActive status
      let code = '';
      if (question.parentId === null) {
        code = `SN${index + 1}`;
        // Only increment counter for active questions
        if (question.isActive) {
          activeCounters.top += 1;
          parentCounter = String(activeCounters.top);
        }
      } else {
        code = `${prefix}.SN${index + 1}`;

        // Initialize counter for this nesting level if it doesn't exist
        const nestingKey = prefix || 'root';
        if (!activeCounters[nestingKey]) {
          activeCounters[nestingKey] = 0;
        }

        // Only increment counter for active questions
        if (question.isActive) {
          activeCounters[nestingKey] += 1;
          // Build the counter string (e.g., "2.1" or "2.1.3")
          parentCounter = parentCounter + '.' + activeCounters[nestingKey];
        }
      }

      codes[question.id] = code;

      let moduleChecklist = `studio-${checklistService}-checklist`;
      // let checklistTypeTemp =  LocalisationCodeUpdate(checklistModule)
      // let roleTemp =  LocalisationCodeUpdate(role)
      if (checklistTypeCode) checklistTypeTemp = checklistTypeCode;

      // Format the final string with the code (generate for all questions)
      let formattedString = `${checklistModule}.${checklistService}.${code}`;

      // Only add message with numbering for active questions
      if (question.isActive) {
        const msg = `${parentCounter}) ${String(question.title)}`;
        const obj = {
          "code": formattedString,
          "message": String(msg),
          "module": moduleChecklist,
          "locale": locale
        }
        local.push(obj);
      }

      // Process options
      if (question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionval = option.label;
          const upperCaseString = optionval.toUpperCase();
          const transformedString = upperCaseString.replace(/ /g, '_');

          if (checklistTypeCode) checklistTypeTemp = checklistTypeCode;
          let formattedStringTemp = `${checklistModule}.${checklistService}.${transformedString}`;

          // Generate codes for options regardless of question's active status
          const obj = {
            "code": formattedStringTemp,
            "message": String(optionval),
            "module": moduleChecklist,
            "locale": locale
          }
          local.push(obj);

          // Process subquestions under options
          if (option.subQuestions) {
            const optionNestingKey = `${code}.${transformedString}`;
            activeCounters[optionNestingKey] = 0;

            option.subQuestions.forEach((subQuestion, subQuestionIndex) => {
              generateCode(
                subQuestion,
                `${code}.${transformedString}`,
                subQuestionIndex,
                question.isActive ? parentCounter : ''
              );
            });
          }
        });
      }

      // Process direct subquestions
      if (question.subQuestions) {
        // Reset counter for this level of subquestions
        activeCounters[code] = 0;

        question.subQuestions.forEach((subQuestion, subQuestionIndex) => {
          generateCode(
            subQuestion,
            code,
            subQuestionIndex,
            question.isActive ? parentCounter : ''
          );
        });
      }
    };

    // Process all top-level questions
    questions.forEach((question, index) => {
      if (question.parentId === null) {
        generateCode(question, '', index);
      }
    });

    return { codes: codes, local: local };
  };
function getFilteredLocaleEntries(quesArray, localeArray, helpText = "") {
  const messages = new Set();
  let activeCount = 0;

  if (helpText?.trim()) {
    messages.add(helpText.trim());
  }

  function traverseQuestions(questions, prefix = "") {
    questions.forEach((question, qIndex) => {
      if (!question?.isActive) return;

      const currentPrefix = prefix ? `${prefix}.${qIndex + 1}` : `${++activeCount}`;
      const formattedPrefix = `${currentPrefix}) `;

      if (question.title) messages.add(formattedPrefix + question.title.trim());
      if (question.helpText) messages.add(question.helpText.trim());

      if (Array.isArray(question.options)) {
        question.options.forEach((option) => {
          if (option.label) messages.add(option.label.trim());

          if (Array.isArray(option.subQuestions)) {
            traverseQuestions(option.subQuestions, currentPrefix);
          }
        });
      }

      if (Array.isArray(question.subQuestions)) {
        traverseQuestions(question.subQuestions, currentPrefix);
      }
    });
  }

  traverseQuestions(quesArray);

  const filteredLocales = localeArray.filter((entry) =>
    messages.has(entry.message?.trim())
  );

  return filteredLocales;
}


  // Helper function remains unchanged as it already handles both active and inactive questions
  function createQuestionObject(item, tenantId, idCodeMap) {
    let labelsArray = [];
    if (item?.options) {
      labelsArray = item.options.map(option => {
        const optionval = option?.label || "";
        const upperCaseString = optionval.toUpperCase();
        return upperCaseString.replace(/ /g, '_');
      });
    }
    if (String(item?.type?.code) === "SingleValueList") {
      labelsArray.push("NOT_SELECTED");
    }

    const questionObject = {
      id: item.id,
      tenantId: tenantId,
      code: idCodeMap[item.id],
      dataType: String(item?.type?.code),
      values: labelsArray,
      required: item?.isRequired,
      isActive: item?.isActive,
      reGex: item?.isRegex ? item?.regex?.regex : null,
      order: item?.key,
      additionalFields: {
        schema: "serviceDefinition",
        version: 1,
        fields: [
          {
            key: crypto.randomUUID(),  // Using crypto.randomUUID() for a unique key
            value: item
          }
        ]
      }
    };

    return questionObject;
  }


  // Recursive function to traverse the question array and its nested subquestions
  function transformQuestions(questions, tenantId, idCodeMap) {
    const result = [];

    questions.forEach(question => {
      // Create the main question object
      const questionObject = createQuestionObject(question, tenantId, idCodeMap);
      result.push(questionObject);

      // Handle subQuestions
      if (question.subQuestions && question.subQuestions.length > 0) {
        const subQuestions = transformQuestions(question.subQuestions, tenantId, idCodeMap);
        result.push(...subQuestions);
      }

      // Handle options with subQuestions
      if (question.options && question.options.length > 0) {
        question.options.forEach(option => {
          if (option.subQuestions && option.subQuestions.length > 0) {
            const optionSubQuestions = transformQuestions(option.subQuestions, tenantId, idCodeMap);
            result.push(...optionSubQuestions);
          }
        });
      }
    });

    return result;
  }
  let uniqueLocal;

  const payloadData = (data) => {

    data.forEach((question) => {
      if (question.type.code === "Short Answer") {
        question.type.code = "String";
        delete question.options;
      }
    });

    processedData = organizeQuestions(data);
    let { codes, local } = generateCodes(processedData);
    // let codes = generateCodes(processedData);
    let final_payload = transformQuestions(processedData, tenantId, codes);
    uniqueLocal = local.filter((value, index, self) =>
      index === self.findIndex((t) => t.code === value.code)
    );
    let fp = final_payload.filter((value, index, self) =>
      index === self.findIndex((t) => JSON.stringify(t) === JSON.stringify(value))
    );
    let checklistTypeTemp =  LocalisationCodeUpdate(checklistModule)
    //let roleTemp =  LocalisationCodeUpdate(role)
    if (checklistTypeCode) checklistTypeTemp = checklistTypeCode;
    let code_of_checklist = `${serviceCode}`;
    return {
      tenantId: tenantId,
      // code: role,
      code: code_of_checklist,
      isActive: true,
      attributes: fp,
      additionalFields: {
        schema: "serviceDefinition",
        version: 1,
        fields: [
          {
            key: crypto.randomUUID(),  // Using crypto.randomUUID() for a unique key
            value: {
              name: checklistName,
              //module: checklistModule,
              //role: role,
              helpText: helpText
            }
          }
        ]
      },

    }
  };

  const generateMdmsChecklistPayload = ({ tenantId, module, service, name, description, data }) => {
    let payload = {};
    if(isUpdate && initialChecklistData)
    {
      payload = {
        Mdms:{
          ...initialChecklistData,
          data:{
            ...initialChecklistData?.data,
            name,
            description,
            data
          }
        }
      }
    }
    else{
      payload = {
        Mdms: {
          tenantId,
          schemaCode: "Studio.Checklists",
          data: {
            module,
            service,
            name,
            description,
            data,
          },
          isActive: true,
        },
        RequestInfo: {
          apiId: "asset-services",
          authToken: Digit.UserService.getUser()?.accessToken || "",
          userInfo: Digit.UserService.getUser()?.info || {},
        },
      };
    }
   
    return payload;
  };
  


  const onSubmit = async (formData, flag = 0, preview = null, translations) => {
    let payload;
    if (flag === 1) {
      payload = payloadData(preview);
    } else {
      payload = payloadData(formData?.createQuestion?.questionData);
    }

    const extractedValues = payload?.attributes?.map(
      (item) => item?.additionalFields?.fields?.[0]?.value
  );

    let allLocalisations = [...uniqueLocal, ...translations].filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.code === value.code && t.locale === value.locale)
    ).filter((item) => item.message !== "");

    setSubmitting(true);
    try {
      
       // Group localizations by locale
      const groupedByLocale = allLocalisations.reduce((acc, entry) => {
        acc[entry.locale] = acc[entry.locale] || [];
        acc[entry.locale].push(entry);
        return acc;
      }, {});
      // Process each locale group
      for (const [localeCode, entries] of Object.entries(groupedByLocale)) {
        const result = await localisationMutateAsync(entries);
        if (!result.success) {
          setShowToast({ label: "LOCALIZATION_FAILED_PLEASE_TRY_AGAIN", isError: "true" });
          return;
        }
      }

      let mdmsPayload = generateMdmsChecklistPayload({tenantId:tenantId,name : checklistName,module:checklistModule,service:checklistService,description:helpText,data:extractedValues})
      // Proceed to create checklist after all locales succeed
      const data = await mdmsMutateAsync(mdmsPayload);

      if (data?.success) { // Updated success condition check
        // history.push(`/${window.contextPath}/employee/campaign/response?isSuccess=${true}`, {
        //   message: "ES_CHECKLIST_CREATE_SUCCESS_RESPONSE",
        //   preText: "ES_CHECKLIST_CREATE_SUCCESS_RESPONSE_PRE_TEXT",
        //   actionLabel: "STUDIO_CONFIGURE_APP_RESPONSE_ACTION",
        //   actionLink: `/${window.contextPath}/employee/campaign/checklist/search?name=${projectName}&campaignId=${campaignId}&projectType=${projectType}&campaignNumber=${campaignNumber}`,
        //   secondaryActionLabel: "VIEW_DETAILS",
        //   secondaryActionLink: `/${window?.contextPath}/employee/campaign/view-details?campaignNumber=${campaignNumber}&tenantId=${tenantId}`,
        // });
        setShowLocalisationPopup(false)
        setShowToast({ label: isUpdate ? "CHECKLIST_UPDATED_SUCCESSFULLY" : "CHECKLIST_CREATED_SUCCESSFULLY", isError: "false" });
        setTimeout(() => {
          history.push(`/${window.contextPath}/employee/servicedesigner/checklist`);
      }, 3000);
      } else {
        setShowToast({ label: "CHECKLIST_CREATED_FAILED", isError: "true" });
      }
    } catch (error) {
      setShowToast({
        label: error.response?.data?.message || "CHECKLIST_CREATED_FAILED",
        isError: "true"
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (showToast !== null) {
      setShowPopUp(false);
    }
  }, [showToast])

  const onSecondayActionClick = () => {
    history.push(`/${window.contextPath}/employee/servicedesigner/checklist`);
  };

  // const fieldPairs = [
  //   { label: "CHECKLIST_ROLE", value: roleLocal },
  //   { label: "TYPE_OF_CHECKLIST", value: checklistTypeLocal },
  //   { label: "CAMPAIGN_NAME", value: campaignName }
  // ];
  return (
    <div>
      {/* {loading_new && <Loader page={true} variant={"PageLoader"}/>}
      {!loading_new && submitting && <Loader page={true} variant={"PageLoader"}/>} */}
      {!submitting && !loading_new &&
        <div>
          {/* <TagComponent campaignName={campaignName} /> */}
          <div style={{ display: "flex", justifyContent: "space-between", height: "5.8rem", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "2.5rem", fontWeight: "700", fontFamily: "Roboto Condensed" }}>
                {isUpdate ? t("UPDATE_NEW_CHECKLIST") :  t("CREATE_NEW_CHECKLIST")}
              </h2>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Button
                variation="secondary"
                label={t("STUDIO_CHECKLIST_CLEAR")}
                className={"hover"}
                style={{ marginTop: "2rem", marginBottom: "2rem" }}
                // icon={<AddIcon style={{ height: "1.5rem", width: "1.5rem" }} fill={PRIMARY_COLOR} />}
                onClick={clearData}
              // onClick={useTemplateData}
              />
              <Button
                icon="Preview"
                variation="secondary"
                label={t("PREVIEW_CHECKLIST")}
                className={"hover"}
                style={{ marginTop: "2rem", marginBottom: "2rem" }}
                // icon={<AddIcon style={{ height: "1.5rem", width: "1.5rem" }} fill={PRIMARY_COLOR} />}
                onClick={popShow}
              />
            </div>
          </div>
          {showPopUp && (
            <PopUp
              className={"custom-pop-up"}
              type={"default"}
              heading={t("CHECKLIST_PREVIEW")}
              children={[
              ]}
              onOverlayClick={() => {
                setShowPopUp(false);
              }}
              onClose={() => {
                setShowPopUp(false);
              }}
              footerChildren={[
                <Button
                  type={"button"}
                  size={"large"}
                  variation={"secondary"}
                  label={t("CLOSE")}
                  onClick={() => {
                    setShowPopUp(false);
                  }}
                />,
                <Button
                  type={"button"}
                  size={"large"}
                  variation={"primary"}
                  label={isUpdate ? t("UPDATE_CHECKLIST") : t("CREATE_CHECKLIST")}
                  onClick={() => {
                    const processed = organizeQuestions(tempFormData);
                    const { local: generatedLocal } = generateCodes(processed);
                    const currentLocalisationData = getFilteredLocaleEntries(processed, generatedLocal);
                    setLocalisationData(currentLocalisationData);
                    setShowLocalisationPopup(true);
                    setShowPopUp(false);
                  }}
                />,
              ]}
              sortFooterChildren={true}
            >
              <MobileChecklist questions={previewData} campaignName={campaignName} checklistRole={t(`${roleLocal}`)} typeOfChecklist={t(`${checklistTypeLocal}`)}></MobileChecklist>
            </PopUp>
          )}
          <Card type={"primary"} variant={"viewcard"} className={"example-view-card"}>
            {/* {fieldPairs.map((pair, index) => (
              <div>
                <SummaryCardFieldPair
                  key={index} // Provide a unique key for each item
                  className=""
                  inline
                  label={t(pair.label)} // Dynamically set the label
                  value={t(pair.value)} // Dynamically set the value
                // style={{ fontSize: "16px", fontWeight: "bold" }} // Optional: customize styles
                />
                {(index !== (fieldPairs.length - 1)) && <div style={{ height: "1rem" }}></div>}
              </div>
            ))} */}
            {/* {
              <hr style={{ width: "100%", borderTop: "1px solid #ccc" }} />
            } */}
            <div style={{ display: "flex" }}>
              <div style={{ width: "26%", fontWeight: "500", marginTop: "0.7rem" }}>{t("NAME_OF_CHECKLIST")}</div>
              <TextInput
                disabled={false}
                className="tetxinput-example"
                type={"text"}
                name={t("NAME_OF_CHECKLIST")}
                value={checklistName}
                // value={`${checklistTypeLocal} ${roleLocal}`}
                //value={`${clTranslated} ${rlTranslated}`}
                onChange={(event) => setChecklistName(event.target.value)}
                placeholder={t("CHECKLIST_NAME_PALCEHOLDER")}
              />
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ width: "26%", fontWeight: "500", marginTop: "0.7rem" }}>{t("CHECKLIST_HELP_TEXT")}</div>
              <TextInput
                disabled={false}
                className="tetxinput-example"
                type={"text"}
                name={t("CHECKLIST_HELP_TEXT")}
                value={helpText}
                // value={`${clTranslated} ${rlTranslated}`}
                onChange={(event) => setHelpText(event.target.value)}
                placeholder={t("CHECKLIST_HELP_TEXT_PALCEHOLDER")}
              />
            </div>
          </Card>
          <div style={{ height: "1rem" }}></div>
          <FormComposerV2
            showMultipleCardsWithoutNavs={true}
            label={isUpdate? t("UPDATE_CHECKLIST") : t("CREATE_CHECKLIST")}
            config={config}
            onSubmit={popShow}
            fieldStyle={{ marginRight: 0 }}
            noBreakLine={true}
            onFormValueChange={onFormValueChange}
            actionClassName={"actionBarClass"}
            noCardStyle={true}
            showSecondaryLabel={true}
            secondaryLabel={t("STUDIO_BACK")}
            onSecondayActionClick={onSecondayActionClick}
          />

          {showToast && (
            <Toast
              varient={showToast?.isError ? "error" : "success"}
              // error={showToast?.isError}
              label={t(showToast?.label)}
              isDleteBtn={"true"}
              onClose={() => closeToast()}
            />
          )}
          {showLocalisationPopup && (
            <PopUp
              className="localisation-popup-container"
              heading={t("ADD_TRANSLATIONS")}
              onClose={() => setShowLocalisationPopup(false)}
              onOverlayClick={() => {
                setShowLocalisationPopup(false);
              }}
            >
              <LocalisationEditorPopup
                locales={currentLocales.filter(local => local !== presentLocale)}
                languages = {languages.filter(item => item.value !== presentLocale)}
                currentLocale={presentLocale}
                localisationData={localisationData}
                onSave={(translations) => {
                  onSubmit(null, 1, tempFormData, translations);
                }}
                onClose={() => setShowLocalisationPopup(false)}
              />
            </PopUp>
          )}
        </div>
      }
      <div style={{ height: "2rem" }}></div>
    </div>
  );
};

export { temp_data, CreateChecklist };
