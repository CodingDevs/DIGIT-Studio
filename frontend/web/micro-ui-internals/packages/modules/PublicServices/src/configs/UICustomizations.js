import { Link, useHistory } from "react-router-dom";
import _ from "lodash";
import { useParams } from "react-router-dom/cjs/react-router-dom";
import React from "react";

//create functions here based on module name set in mdms(eg->SearchProjectConfig)
//how to call these -> Digit?.Customizations?.[masterName]?.[moduleName]
// these functions will act as middlewares
// var Digit = window.Digit || {};

const businessServiceMap = {};

const inboxModuleNameMap = {};

export const UICustomizations = {
    searchGenericConfig: {
        customValidationCheck: (data) => {
          //checking both to and from date are present
          const { createdFrom, createdTo, field, value } = data;
          if (
            (createdFrom === "" && createdTo !== "") ||
            (createdFrom !== "" && createdTo === "")
          )
            return { type: "warning", label: "ES_COMMON_ENTER_DATE_RANGE" };
    
          if ((field && !value) || (!field && value)) {
            return {
              type: "warning",
              label: "WBH_MDMS_SEARCH_VALIDATION_FIELD_VALUE_PAIR",
            };
          }
    
          return false;
        },
        preProcess: (data, additionalDetails) => {
          const tenantId = Digit.ULBService.getCurrentTenantId();
          data.body.SearchCriteria.tenantId = tenantId;
        //   const filters = {};
          const custom = data.body.SearchCriteria.custom;
          data.headers = {"X-Tenant-Id":tenantId, "auth-token" : window?.localStorage?.getItem("Employee.token"),}
          data.params = {tenantId : tenantId};
          data.method = "GET"
          data.config = { enabled : false   }
          if(custom?.applicationNumber) data.params.applicationNumber = custom?.applicationNumber;
          if(custom?.status) data.params.status = custom?.status;
          if(custom?.todate) data.params.todate = Digit.Utils.date.convertDateToEpoch(custom?.todate);
          if(custom?.fromdate) data.params.fromdate = Digit.Utils.date.convertDateToEpoch(custom?.fromdate);
          if(data?.state?.searchForm?.businessService) data.url = `${data.url}/${data?.state?.searchForm?.businessService?.serviceCode}`
          if(data?.state?.searchForm?.businessService) data.config = { enabled : true}
          delete data.body.SearchCriteria.custom;
          return data;
        },
        additionalCustomizations: (row, key, column, value, t, searchResult) => {
          switch (key) {
            case `${row?.module.toUpperCase()}_APPLICATION_NUMBER`:
              return (
                <span className="link">
            <Link to={`/${window.contextPath}/employee/publicservices/${row?.module}/${row?.businessService}/ViewScreen?applicationNumber=${row?.applicationNumber}&serviceCode=${row?.serviceCode}`}>
            {String(value ? value : t("ES_COMMON_NA"))}
            </Link>
          </span>
              );
            default:
              return t("ES_COMMON_NA");
          }
        },
        MobileDetailsOnClick: (row, tenantId) => {
          let link;
          Object.keys(row).map((key) => {
            if (key === "MASTERS_WAGESEEKER_ID")
              link = `/${window.contextPath}/employee/masters/view-wageseeker?tenantId=${tenantId}&wageseekerId=${row[key]}`;
          });
          return link;
        },
        additionalValidations: (type, data, keys) => {
          if (type === "date") {
            return data[keys.start] && data[keys.end]
              ? () =>
                  new Date(data[keys.start]).getTime() <=
                  new Date(data[keys.end]).getTime()
              : true;
          }
        },
        selectionHandler: (event) => {
        }, // selectionHandler : Is used to handle row selections. gets on object which containes 3 key value pairs:  allSelected(whether all rows are selected or not), selectedCount (no, of rows selected),selectedRows( an array of selected rows)
        actionSelectHandler: (index, label, selectedRows) => {
        }, // actionSelectHandler : Is used to handle onClick functions of table action button on row selections, gets index,label and selectedRows as props
        footerActionHandler: (index, event) => {
        }, // footerActionHandler : Is used to handle onclick functions of footer action buttons, gets index and event as props
        linkColumnHandler: (row) => {
          const url = `/${window.contextPath}/employee/microplan/view-main?tenantId=${row?.tenantId}&uniqueIdentifier=${row?.uniqueIdentifier}`;
          const history = useHistory();
          history.push(url);
          //window.location.href = url;
        }, 
      },

      InboxGenericConfig:{
        preProcess: (data, additionalDetails) => {
          const { module } = useParams();
          const tenantId = Digit.ULBService.getCurrentTenantId();
          data.body.inbox.moduleSearchCriteria.businessService=`${data?.state?.searchForm?.businessService?.code}` || "ApplyForm";
          data.body.inbox.moduleSearchCriteria.module=`${module}`;
          data.body.inbox.processSearchCriteria.businessService=[data?.state?.searchForm?.businessService?.workflowBusinessService] || "school.Apply";
          if(data?.state?.searchForm?.businessService?.parallelWorkflow?.length > 0){
            data.body.inbox.processSearchCriteria.businessService = [...data.body.inbox.processSearchCriteria.businessService,...data?.state?.searchForm?.businessService?.parallelWorkflow]
          }
          data.body.inbox.processSearchCriteria.tenantId = tenantId;
          data.body.inbox.tenantId = tenantId;
          delete data.body.inbox.moduleSearchCriteria.assignee;
          data.method = "POST"
          data.changeQueryName = `INBOX_${data?.state?.searchForm?.businessService?.workflowBusinessService}`
          return data;
        },
        additionalCustomizations: (row, key, column, value, t, searchResult) => {
          if (key === "Application Number") {
            return (
              <span className="link">
                <Link
                  to={`/${window.contextPath}/employee/publicservices/${row?.businessObject?.module}/${row?.businessObject?.businessService}/ViewScreen?applicationNumber=${row?.businessObject?.applicationNumber}&serviceCode=${row?.businessObject?.serviceCode}&businessService=${row?.ProcessInstance?.businessService}`}
                >
                  {String(value ? value : t("ES_COMMON_NA"))}
                </Link>
              </span>
            );
          }
        },
        selectionHandler: (event) => {
        }, // selectionHandler : Is used to handle row selections. gets on object which containes 3 key value pairs:  allSelected(whether all rows are selected or not), selectedCount (no, of rows selected),selectedRows( an array of selected rows)
        actionSelectHandler: (index, label, selectedRows) => {
        }, // actionSelectHandler : Is used to handle onClick functions of table action button on row selections, gets index,label and selectedRows as props
        footerActionHandler: (index, event) => {
        },// footerActionHandler : Is used to handle onclick functions of footer action buttons, gets index and event as props
      }
};