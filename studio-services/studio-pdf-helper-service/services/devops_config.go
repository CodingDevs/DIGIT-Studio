package services

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/go-git/go-git/v5"
	gitcfg "github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"gopkg.in/yaml.v3"
)

type DevOpsConfigService struct {
	repoURL      string
	repoPath     string
	yamlFilePath string
	branch       string
}

func NewDevOpsConfigService(repoURL, repoPath, yamlFilePath, branch string) *DevOpsConfigService {
	return &DevOpsConfigService{
		repoURL:      repoURL,
		repoPath:     repoPath,
		yamlFilePath: yamlFilePath,
		branch:       branch,
	}
}

func (s *DevOpsConfigService) UpdateConfigUrls(service, module, key string) error {
	repo, err := s.getRepo()
	if err != nil {
		return fmt.Errorf("error with repository: %v", err)
	}

	// Use line-based append for resiliency
	dataPath := fmt.Sprintf("file:///work-dir/configs/pdf-service/data-config/%s-%s-%s.json", service, module, key)
	formatPath := fmt.Sprintf("file:///work-dir/configs/pdf-service/format-config/%s-%s-%s.json", service, module, key)

	err = AppendToPdfServiceConfig(s.yamlFilePath, []string{dataPath}, []string{formatPath})
	if err != nil {
		return fmt.Errorf("error appending config URLs: %w", err)
	}

	return s.commitAndPush(repo, fmt.Sprintf("Added config URLs for %s-%s-%s", service, module, key))
}

func AppendToPdfServiceConfig(filePath string, newDataUrls, newFormatUrls []string) error {
	input, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	lines := strings.Split(string(input), "\n")
	for i := range lines {
		if strings.Contains(lines[i], "data-config-urls:") {
			lines[i] += "," + strings.Join(newDataUrls, ",")
		}
		if strings.Contains(lines[i], "format-config-urls:") {
			lines[i] += "," + strings.Join(newFormatUrls, ",")
		}
	}

	output := strings.Join(lines, "\n")
	err = os.WriteFile(filePath, []byte(output), 0644)
	if err != nil {
		return fmt.Errorf("failed to write updated yaml: %w", err)
	}
	return nil
}

func (s *DevOpsConfigService) commitAndPush(repo *git.Repository, message string) error {
	w, err := repo.Worktree()
	if err != nil {
		return err
	}

	relativePath := strings.TrimPrefix(s.yamlFilePath, s.repoPath+"/")
	log.Printf("Adding file to git: %s", relativePath)

	if err := logFileWithLineNumbers(s.yamlFilePath); err != nil {
		log.Printf("Warning: failed to log file content: %v", err)
	}

	_, err = w.Add(relativePath)
	if err != nil {
		return err
	}

	status, err := w.Status()
	if err != nil {
		return err
	}

	if status.IsClean() {
		log.Println("No new changes to commit, but attempting to push in case previous push failed...")
	} else {
		log.Println("Changes detected, committing...")
		_, err = w.Commit(message, &git.CommitOptions{})
		if err != nil {
			return err
		}
	}

	auth := &http.BasicAuth{
		Username: "github-user",
		Password: os.Getenv("GITHUB_TOKEN"),
	}

	log.Println("Pushing to remote...")
	err = repo.Push(&git.PushOptions{
		Auth: auth,
	})
	if err != nil {
		if errors.Is(err, git.NoErrAlreadyUpToDate) {
			log.Println("Nothing to push. Repo already up to date.")
			return nil
		}
		return fmt.Errorf("push failed: %w", err)
	}

	log.Println("Successfully pushed to remote.")
	return nil
}

func (s *DevOpsConfigService) getRepo() (*git.Repository, error) {
	log.Printf("Checking if local repo exists at path: %s", s.repoPath)

	repo, err := git.PlainOpen(s.repoPath)
	if err != nil {
		log.Printf("Local repo not found or invalid. Cloning repo from %s (branch: %s)...", s.repoURL, s.branch)

		if _, statErr := os.Stat(s.repoPath); statErr == nil {
			log.Printf("Cleaning up existing non-repo directory at %s", s.repoPath)
			os.RemoveAll(s.repoPath)
		}

		repo, err = git.PlainClone(s.repoPath, false, &git.CloneOptions{
			URL:           s.repoURL,
			Progress:      os.Stdout,
			SingleBranch:  true,
			ReferenceName: plumbing.NewBranchReferenceName(s.branch),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to clone repository: %v", err)
		}
		log.Println("Repository cloned successfully.")
		return repo, nil
	}

	log.Println("Local repo found.")

	w, err := repo.Worktree()
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %v", err)
	}

	branchRef := plumbing.NewBranchReferenceName(s.branch)
	err = w.Checkout(&git.CheckoutOptions{
		Branch: branchRef,
		Force:  true,
	})
	if err != nil {
		log.Printf("Checkout failed: %v. Attempting to fetch and create branch from remote.", err)

		err = repo.Fetch(&git.FetchOptions{
			RemoteName: "origin",
			RefSpecs:   []gitcfg.RefSpec{"+refs/heads/*:refs/remotes/origin/*"},
		})
		if err != nil && err != git.NoErrAlreadyUpToDate {
			return nil, fmt.Errorf("failed to fetch from origin: %v", err)
		}

		branches, _ := repo.Branches()
		branchExists := false
		_ = branches.ForEach(func(ref *plumbing.Reference) error {
			if ref.Name() == branchRef {
				branchExists = true
			}
			return nil
		})

		if branchExists {
			err = w.Checkout(&git.CheckoutOptions{
				Branch: branchRef,
				Force:  true,
			})
		} else {
			err = w.Checkout(&git.CheckoutOptions{
				Branch: branchRef,
				Create: true,
				Force:  true,
			})
		}

		if err != nil {
			return nil, fmt.Errorf("failed to checkout remote branch after fetch: %v", err)
		}
		log.Printf("Checked out remote branch: %s", s.branch)
	}

	log.Println("Pulling latest changes...")
	err = w.Pull(&git.PullOptions{
		RemoteName:    "origin",
		ReferenceName: branchRef,
		SingleBranch:  true,
		Force:         true,
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return nil, fmt.Errorf("failed to pull latest changes: %v", err)
	}
	log.Println("Successfully pulled latest changes.")
	return repo, nil
}

func checkDuplicatePDFService(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("error opening YAML file for validation: %v", err)
	}
	defer f.Close()

	decoder := yaml.NewDecoder(bufio.NewReader(f))
	for {
		var node yaml.Node
		err := decoder.Decode(&node)
		if err != nil {
			break
		}
		logDuplicateKeys(&node)
	}
	return nil
}

func logDuplicateKeys(node *yaml.Node) {
	if node.Kind == yaml.MappingNode {
		keys := map[string]int{}
		for i := 0; i < len(node.Content); i += 2 {
			k := node.Content[i]
			v := node.Content[i+1]

			if prevLine, ok := keys[k.Value]; ok {
				log.Printf("⚠️ Duplicate key '%s' found at line %d (already declared at line %d)", k.Value, k.Line, prevLine)
			}
			keys[k.Value] = k.Line

			logDuplicateKeys(v)
		}
	} else if node.Kind == yaml.SequenceNode {
		for _, item := range node.Content {
			logDuplicateKeys(item)
		}
	}
}

func logFileWithLineNumbers(filePath string) error {
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	lineNum := 1
	log.Println("---- File content start ----")
	for scanner.Scan() {
		log.Printf("%4d: %s", lineNum, scanner.Text())
		lineNum++
	}
	log.Println("---- File content end ----")

	return scanner.Err()
}
