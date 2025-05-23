import React, { useEffect, useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import ActionBar from "./ActionBar";
import ActionModal from "./ActionModal";

// import Toast from "./Toast";
import { useHistory } from "react-router-dom";
import { Toast, Button , Loader} from "@egovernments/digit-ui-components";
import { useMutation } from "react-query";
import { useQuery, useQueryClient } from "react-query";

import { Request } from "./Request";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import { useWorkflowDetailsWorks } from "../utils";

export const CustomService = {
  getResponse: ({ url, params, body, plainAccessRequest,useCache=true,userService=true,setTimeParam=true,userDownload=false,auth=true, headers={}, method="POST"}) =>  Request({
      url: url,
      data: body,
      useCache,
      userService,
      method: method,
      auth:auth,
      params: params,
      headers: headers,
      plainAccessRequest: plainAccessRequest,
      userDownload:userDownload,
      setTimeParam
    })
};

const ApplicationUpdateActionsCustom = async ({ url, body, headers }) => {
  try {
      //here need to update this object to send
      const response = await CustomService.getResponse({ url, body,useCache:false,setTimeParam:false, method:"PUT",headers });
      return response;
  } catch (error) {
      throw new Error(error?.response?.data?.Errors[0].message);
  }
};

const useUpdateCustom = ( url,headers ) => {
  return useMutation((applicationData) => ApplicationUpdateActionsCustom({url,body:applicationData,headers}));
};

const WorkflowActions = ({ businessService, tenantId, applicationNo, forcedActionPrefix, ActionBarStyle = {}, MenuStyle = {}, applicationDetails, url, setStateChanged, moduleCode,editApplicationNumber,editCallback ,callback, WorflowValidation, fullData, isDisabled, ...props}) => {
  
  const history = useHistory()
  const { estimateNumber, mbNumber, workOrderNumber } = Digit.Hooks.useQueryParams();
  applicationNo = applicationNo ? applicationNo : estimateNumber 
  const { module, service } = useParams();

  const { mutate } = useUpdateCustom(url,{"X-Tenant-Id": tenantId});

  const [displayMenu,setDisplayMenu] = useState(false)
  const [showModal,setShowModal] = useState(false)
  const [selectedAction,setSelectedAction] = useState(null)
  const [isEnableLoader, setIsEnableLoader] = useState(false);
  const [showToast,setShowToast] = useState(null)
  const queryStrings = Digit.Hooks.useQueryParams();


  

  const { t } = useTranslation();
  let user = Digit.UserService.getUser();

  let workflowDetails = useWorkflowDetailsWorks(
    {
      tenantId: tenantId,
      id: applicationNo,
      moduleCode: businessService,
      config: {
        enabled: true,
        cacheTime: 0
      }
    }
  );

  

  const menuRef = useRef();

  const userRoles = user?.info?.roles?.map((e) => e.code);
  let isSingleButton = false;
  let isMenuBotton = false;
  let actions = workflowDetails?.data?.actionState?.nextActions?.filter((e) => {
    return userRoles.some((role) => e.roles?.includes(role)) || !e.roles;
  }) || workflowDetails?.data?.nextActions?.filter((e) => {
    return userRoles.some((role) => e.roles?.includes(role)) || !e.roles;
  });

  const closeMenu = () => {
    setDisplayMenu(false);
  }
  
  const closeToast = () => {
    setTimeout(() => {
      setShowToast(null)
    }, 5000);
  }
 
  setTimeout(() => {
    setShowToast(null);
  }, 20000);
    
  
  
  Digit.Hooks.useClickOutside(menuRef, closeMenu, displayMenu);

  if (actions?.length > 0) {
    isMenuBotton = true;
    isSingleButton = false;
  }

  const closeModal = () => {
    setSelectedAction(null);
    setShowModal(false);
    setShowToast({ type:"warning",label:`WF_ACTION_CANCELLED`})
    closeToast()
  };

  const onActionSelect = (action) => {
    
    // const bsContract = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("contract");
    // const bsEstimate = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("estimate")
    // const bsAttendance = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("muster roll")
    // const bsPurchaseBill = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("works.purchase")
    // const bsRevisedWO = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("revisedWO");
    // const bsMeasurement = Digit?.Customizations?.["commonUiConfig"]?.getBusinessService("measurement");
    
    
    setDisplayMenu(false)
    setSelectedAction(action);
    if(action.action === "PAY")
    {
      history.push(`/${window.contextPath}/employee/openpayment/open-view?consumerCode=${applicationNo}&tenantId=${tenantId}&businessService=${businessService}`, {
        redirectionUrl :  `/${window.contextPath}/employee/publicservices/${module}/${service}/ViewScreen?applicationNumber=${applicationNo}&serviceCode=${queryStrings?.serviceCode}`,

      });
    }

    //here check if actin is edit then do a history.push acc to the businessServ and action
    //send appropriate states over

  //   if(bsEstimate === businessService && action?.action === "RE-SUBMIT"){
  //      editCallback()
  //       return 
  //   }

  //   if(bsContract === businessService && action?.action === "EDIT"){
  //     history.push(`/${window?.contextPath}/employee/contracts/create-contract?tenantId=${tenantId}&workOrderNumber=${applicationNo}`);
  //     return 
  // }
  //   if(bsAttendance === businessService && action?.action === "RE-SUBMIT"){
  //       editCallback()
  //       return 
  //   }
  //   if(bsAttendance === businessService && action?.action === "APPROVE"){
  //     WorflowValidation(setShowModal);
  //     return 
  //   }

  //   if(bsPurchaseBill === businessService && action?.action==="RE-SUBMIT"){
  //     history.push(`/${window?.contextPath}/employee/expenditure/create-purchase-bill?tenantId=${tenantId}&billNumber=${editApplicationNumber}&workOrderNumber=${fullData?.contract?.contractNumber}`);
  //     return 
  //   }

  //   if(bsMeasurement === businessService && action?.action?.includes("RE-SUBMIT")){
  //     history.push(`/${window?.contextPath}/employee/measurement/update?tenantId=${tenantId}&workOrderNumber=${workOrderNumber}&mbNumber=${mbNumber}`);
  //     return 
  //   }

  //   if(bsRevisedWO === businessService && action?.action === "EDIT"){
  //     editCallback()
  //     return 
  //   }
    //here we can add cases of toast messages,edit application and more...
    // the default result is setting the modal to show
    action !== "PAY" && setShowModal(true)
    
  }

  const submitAction = (data,selectAction) => {
    setShowModal(false)
    setIsEnableLoader(true)
    const mutateObj = {...data}

    
    mutate(mutateObj,{
      onError:(error,variables)=>{
        setIsEnableLoader(false)
        //show error toast acc to selectAction
        setShowToast({ type:"error", label: Digit.Utils.locale.getTransformedLocale(`WF_UPDATE_ERROR_${businessService}_${selectAction.action}`), isDleteBtn:true })
        
        callback?.onError?.();

        
        
      },
      onSuccess:(data,variables) => {
        setIsEnableLoader(false)
        //show success toast acc to selectAction
        setShowToast({ label: Digit.Utils.locale.getTransformedLocale(`WF_UPDATE_SUCCESS_${businessService}_${selectAction.action}`) })
        
        callback?.onSuccess?.();
        // to refetch updated workflowData and re-render timeline and actions
        workflowDetails.revalidate()

        
        //COMMENTING THIS FOR NOW BECAUSE DUE TO THIS TOAST IS NOT SHOWING SINCE THE WHOLE PARENT COMP RE-RENDERS
        // setStateChanged(`WF_UPDATE_SUCCESS_${selectAction.action}`)
      }
    })
  }

  //if workflowDetails are loading then a loader is displayed in workflowTimeline comp anyway
  if(isEnableLoader){
    return <Loader />
  }

  actions?.forEach(action => {
    action.displayname = `WF_${module.toUpperCase()}_${businessService?.toUpperCase()?.replaceAll(/[./-]/g,"_")}_ACTION_${action?.action?.replaceAll(/[./-]/g, "_")}`;
  });
  return (
    <React.Fragment>
      {!workflowDetails?.isLoading && isMenuBotton && !isSingleButton && (
        <ActionBar
          style={{ ...ActionBarStyle }}
          actionFields={props?.actionFields?.length > 0 ? [
            ...props?.actionFields,
            <Button
              t={t}
              type={workflowDetails?.data?.actionState?.nextActions || workflowDetails?.data?.nextActions ? "actionButton" : "submit"}
              options={actions}
              label={t(`${module.toUpperCase()}_${service.toUpperCase()}_ACTIONS`)}
              variation={"primary"}
              optionsKey={"displayname"}
              isSearchable={false}
              isDisabled={isDisabled}
              onOptionSelect={(option) => {
                onActionSelect(option);
              }}
              menuStyles={MenuStyle}
            ></Button>,
          ] : [
            <Button
              t={t}
              type={workflowDetails?.data?.actionState?.nextActions || workflowDetails?.data?.nextActions ? "actionButton" : "submit"}
              options={actions}
              label={t(`${module.toUpperCase()}_${service.toUpperCase()}_ACTIONS`)}
              variation={"primary"}
              optionsKey={"displayname"}
              isSearchable={false}
              isDisabled={isDisabled}
              onOptionSelect={(option) => {
                onActionSelect(option);
              }}
              menuStyles={MenuStyle}
            ></Button>,
          ]}
          setactionFieldsToRight={true}
          // className={"new-actionbar"}
        />
      )}
      { !workflowDetails?.isLoading && !isMenuBotton && isSingleButton && (
        <ActionBar
          style={{ ...ActionBarStyle }}
          actionFields={[
            ...actionFields,
            <Button
              type={"submit"}
              value={actions?.[0]?.action}
              name={actions?.[0]?.action}
              isDisabled={isDisabled}
              label={t(
                Digit.Utils.locale.getTransformedLocale(
                  `${forcedActionPrefix || `WF_${module?.toUpperCase()}_${businessService?.toUpperCase()}_ACTION`}_${actions?.[0]?.action}`
                )
              )}
              variation={"primary"}
              onClick={(e) => {
                onActionSelect(actions?.[0] || {});
              }}
            ></Button>,
          ]}
          setactionFieldsToRight={true}
          className={"new-actionbar"}
        />
      )}
      {showModal && (
        <ActionModal
          t={t}
          action={selectedAction}
          tenantId={tenantId}
          id={applicationNo}
          closeModal={closeModal}
          submitAction={submitAction}
          businessService={businessService}
          applicationDetails={applicationDetails}
          moduleCode={moduleCode}
        />
      )}
      {showToast && (
        <Toast
          type={showToast?.type}
          label={t(showToast?.label)}
          onClose={() => {
            setShowToast(null);
          }}
          isDleteBtn={showToast?.isDleteBtn}
        />
      )}
    </React.Fragment>
  );
}

export default WorkflowActions