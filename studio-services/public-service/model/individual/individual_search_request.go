package individual

import "public-service/model"

// IndividualSearchRequest maps the Java class org.egov.common.models.individual.IndividualSearchRequest
type IndividualSearchRequest struct {
	RequestInfo model.RequestInfo `json:"RequestInfo"` // NotNull
	Individual  IndividualSearch  `json:"Individual"`  // NotNull
}
