package model

type EnrichmentService interface {
	EnrichApplicationsWithIndividuals(apps []Application) []Application
}
