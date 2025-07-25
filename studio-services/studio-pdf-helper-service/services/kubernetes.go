package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
	"path/filepath"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type KubernetesService struct {
	kubeAPIURL     string
	kubeToken      string
	namespace      string
	deploymentName string
	clientset      *kubernetes.Clientset
}

func NewKubernetesService(namespace string) (*KubernetesService, error) {
	var config *rest.Config
	var err error

	// Check ENV to decide how to load config
	if os.Getenv("ENV") == "local" {
		kubeconfigPath := filepath.Join(os.Getenv("HOME"), ".kube", "config")
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfigPath)
		if err != nil {
			return nil, fmt.Errorf("error loading local kubeconfig: %v", err)
		}
	} else {
		config, err = rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("error getting cluster config: %v", err)
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("error creating kubernetes client: %v", err)
	}

	service := &KubernetesService{
		kubeAPIURL:     os.Getenv("KUBE_API_URL"),
		kubeToken:      os.Getenv("KUBE_TOKEN"),
		namespace:      namespace,
		deploymentName: "pdf-service",
		clientset:      clientset,
	}

	if err := service.validateEnvironment(); err != nil {
		return nil, err
	}

	return service, nil
}

func (k *KubernetesService) validateEnvironment() error {
	if k.kubeAPIURL == "" {
		return fmt.Errorf("KUBE_API_URL environment variable not set")
	}
	if k.kubeToken == "" {
		return fmt.Errorf("KUBE_TOKEN environment variable not set")
	}
	if k.namespace == "" {
		return fmt.Errorf("namespace not set")
	}
	return nil
}

func (k *KubernetesService) RestartPDFService(ctx context.Context) error {
	// Create patch payload for restart
	patchPayload := map[string]interface{}{
		"spec": map[string]interface{}{
			"template": map[string]interface{}{
				"metadata": map[string]interface{}{
					"annotations": map[string]interface{}{
						"kubectl.kubernetes.io/restartedAt": time.Now().Format(time.RFC3339),
					},
				},
			},
		},
	}

	payloadBytes, err := json.Marshal(patchPayload)
	if err != nil {
		return fmt.Errorf("error marshaling patch payload: %v", err)
	}

	// Create request URL
	url := fmt.Sprintf("%s/apis/apps/v1/namespaces/%s/deployments/%s",
		k.kubeAPIURL, k.namespace, k.deploymentName)

	// Create request with context
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("error creating request: %v", err)
	}

	// Add headers
	req.Header.Set("Authorization", "Bearer "+k.kubeToken)
	req.Header.Set("Content-Type", "application/strategic-merge-patch+json")

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

func (k *KubernetesService) RestartPDFServiceWithRetry(ctx context.Context, maxRetries int) error {
	for i := 0; i < maxRetries; i++ {
		err := k.RestartPDFService(ctx)
		if err == nil {
			// Wait for service to be ready after successful restart
			if err := k.WaitForServiceReady(ctx, 5*time.Minute); err != nil {
				return fmt.Errorf("service restart succeeded but failed to become ready: %v", err)
			}
			return nil
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled while retrying service restart")
		case <-time.After(time.Second * 5):
			continue
		}
	}
	return fmt.Errorf("failed to restart service after %d attempts", maxRetries)
}

func (k *KubernetesService) WaitForServiceReady(ctx context.Context, timeout time.Duration) error {
	start := time.Now()
	for {
		if time.Since(start) > timeout {
			return fmt.Errorf("timeout waiting for service to be ready")
		}

		deployment, err := k.clientset.AppsV1().Deployments(k.namespace).
			Get(ctx, k.deploymentName, metav1.GetOptions{})
		if err != nil {
			return fmt.Errorf("error getting deployment status: %v", err)
		}

		if deployment.Status.ReadyReplicas == deployment.Status.Replicas &&
			deployment.Status.UpdatedReplicas == deployment.Status.Replicas {
			return nil
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled while waiting for service ready")
		case <-time.After(time.Second * 5):
			continue
		}
	}
}
