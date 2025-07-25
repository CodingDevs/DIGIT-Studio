package github

import (
    "context"
    "fmt"
    "os"

    "github.com/google/go-github/v55/github"
    "golang.org/x/oauth2"
)

func CreateOrUpdateFile(relativePath string, content []byte) error {
    ctx := context.Background()
    ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: os.Getenv("GITHUB_TOKEN")})
    tc := oauth2.NewClient(ctx, ts)
    client := github.NewClient(tc)

    owner := os.Getenv("GITHUB_OWNER")
    repo := os.Getenv("GITHUB_CONFIG_REPO")
    branch := os.Getenv("GITHUB_CONFIG_BRANCH")
    basePath := os.Getenv("GITHUB_CONFIG_BASE_PATH")
    fullPath := fmt.Sprintf("%s/%s", basePath, relativePath)

    fileContent, _, resp, err := client.Repositories.GetContents(ctx, owner, repo, fullPath, &github.RepositoryContentGetOptions{
        Ref: branch,
    })

    var sha *string
    if err == nil && fileContent != nil {
        sha = fileContent.SHA
    } else if resp != nil && resp.StatusCode != 404 {
        return err
    }

    opts := &github.RepositoryContentFileOptions{
        Message:   github.String("Add/update " + fullPath),
        Content:   content,
        SHA:       sha,
        Branch:    github.String(branch),
        Committer: &github.CommitAuthor{Name: github.String("pdf-service-bot"), Email: github.String("bot@egov.org")},
    }

    _, _, err = client.Repositories.CreateFile(ctx, owner, repo, fullPath, opts)
    return err
}
