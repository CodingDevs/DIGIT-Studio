import React,{ useState,useEffect } from 'react'

//import modal from './config/configEstimateModal'
import configModal from './modalConfig'
import Modal from './Modal';

import { Loader } from '@egovernments/digit-ui-components'
import { FormComposerV2 } from '@egovernments/digit-ui-components';

const Heading = (props) => {
    return <h1 className="heading-m">{props.label}</h1>;
};

const Close = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFFFFF">
        <path d="M0 0h24v24H0V0z" fill="none" />
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
    </svg>
);

const CloseBtn = (props) => {
    return (
        <div className="icon-bg-secondary" onClick={props.onClick}>
            <Close />
        </div>
    );
};
   

const updatePayload = (applicationDetails, data, action, businessService) => {
      const workflow = {
        comments: data.comments,
        documents: data?.document ? Object.values(data?.document).flat().map((document) => {
          return {
            documentType: action?.action + " DOC",
            fileName: document?.[1]?.file?.name,
            fileStoreId: document?.[1]?.fileStoreId?.fileStoreId,
            documentUid: document?.[1]?.fileStoreId?.fileStoreId,
            tenantId: document?.[1]?.fileStoreId?.tenantId,
          };
        }) : [],
        assignees: data?.assignees?.uuid ? [data?.assignees?.uuid] : null,
        action: action.action,
        businessService: businessService,
      };
      //filtering out the data
      Object.keys(workflow).forEach((key, index) => {
        if (!workflow[key] || workflow[key]?.length === 0) delete workflow[key];
      });
      // ap[0] = {...ap[0]wor:{}}
      applicationDetails = {...applicationDetails,"workflow" : workflow}
      return {
        Application: applicationDetails
      };
  }


const WorkflowPopup = ({ applicationDetails,...props}) => {
    const {
        action,
        tenantId,
        t,
        closeModal,
        submitAction,
        businessService,
        moduleCode
    } = props
    const enableAssignee = Digit?.Customizations?.["commonUiConfig"]?.enableHrmsSearch(businessService,action)
    // const [approvers,setApprovers] = useState([])
    const [config,setConfig] = useState(null)
    const [modalSubmit,setModalSubmit] = useState(true)
    //hrms user search
    let { isLoading: isLoadingHrmsSearch, isError, error, data: assigneeOptions } = Digit.Hooks.hrms.useHRMSSearch({ roles: action?.assigneeRoles?.toString(), isActive: true }, tenantId, null, null, { enabled: action?.assigneeRoles?.length > 0 && enableAssignee });
    
    assigneeOptions = assigneeOptions?.Employees
    assigneeOptions?.map(emp => emp.nameOfEmp = emp?.user?.name || t("ES_COMMON_NA"))

    const requestCriteria = {
      url: "/egov-mdms-service/v1/_search",
      body: {
        MdmsCriteria: {
          "tenantId": Digit.ULBService.getCurrentTenantId(),
          "moduleDetails": [
              {
                  "moduleName": "DigitStudio",
                  "masterDetails": [
                      {
                          "name": "DocumentConfig2"
                      }
                  ]
              }
          ]
      },
      },
      changeQueryName: "documentConfig",
    };
  
    const { isLoading, data } = Digit.Hooks.useCustomAPIHook(requestCriteria);

    
    useEffect(() => {
      if(businessService==="muster-roll-approval" && action.action==="APPROVE"){
        setModalSubmit(false)
      }
    }, [businessService])
    

    useEffect(() => {
      if(assigneeOptions?.length >=0 && data){
      setConfig(
        configModal(t,action,assigneeOptions,businessService, moduleCode, data?.MdmsRes?.DigitStudio?.DocumentConfig2)
      )
      }
      else {
        setConfig(
            configModal(t, action, undefined, businessService, moduleCode, data?.MdmsRes?.DigitStudio?.DocumentConfig2)
        )
      }
      
    }, [assigneeOptions, data])
    
    const _submit = (data) => {
        if(data?.document) Object.values(data?.document).flat();
        //const updatePayload = Digit?.Customizations?.["commonUiConfig"]?.updatePayload(applicationDetails, data, action, businessService)
        const customupdatePayload = updatePayload(applicationDetails, data, action, businessService);
        //calling submitAction 
        submitAction(customupdatePayload, action)

    }

    const modalCallBack = (setValue, formData, formState, reset, setError, clearErrors, trigger, getValues) => {
        Digit?.Customizations?.["commonUiConfig"]?.enableModalSubmit(businessService,action,setModalSubmit,formData)
    }

    if(isLoadingHrmsSearch || isLoading) return <Loader />
    
    return action && config?.form ? (
        <Modal
            headerBarMain={<Heading label={t(config.label.heading)} />}
            headerBarEnd={<CloseBtn onClick={closeModal} />}
            actionCancelLabel={t(config.label.cancel)}
            actionCancelOnSubmit={closeModal}
            actionSaveLabel={t(config.label.submit)}
            actionSaveOnSubmit={(data) => {console.log(data.target.value,"coming here")}}
            formId="modal-action"
            isDisabled = {!modalSubmit}
        >
            <FormComposerV2
                config={config.form}
                noBoxShadow
                inline
                childrenAtTheBottom
                onSubmit={_submit}
                defaultValues={{}}
                formId="modal-action"
                onFormValueChange={modalCallBack}
            />

        </Modal>
    ) : (
        <Loader />
    );
}

export default WorkflowPopup