package services

import (
	"path/filepath"
	"regexp"
	"strings"
)

// FileParserService handles parsing of uploaded files
type FileParserService struct{}

// ParsedMemorySection represents a section extracted from a file
type ParsedMemorySection struct {
	Content string // The text content
	Heading string // For MD: the heading text, for TXT: filename
	Order   int    // Position in original file (for sorting)
}

// FileUploadError represents errors during file upload/parsing
type FileUploadError struct {
	Code    string // "invalid_type", "too_large", "empty_file", "parse_error"
	Message string
}

func (e *FileUploadError) Error() string {
	return e.Message
}

const (
	// MaxFileSize is the maximum allowed file size (5 MB)
	MaxFileSize = 5 * 1024 * 1024
)

// NewFileParserService creates a new FileParserService
func NewFileParserService() *FileParserService {
	return &FileParserService{}
}

// ValidateFile checks if the file type and size are valid
func (s *FileParserService) ValidateFile(filename string, size int64) error {
	// Check file size
	if size > MaxFileSize {
		return &FileUploadError{
			Code:    "too_large",
			Message: "File exceeds 5MB limit",
		}
	}

	// Check file type
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".txt" && ext != ".md" {
		return &FileUploadError{
			Code:    "invalid_type",
			Message: "Only .txt and .md files allowed",
		}
	}

	return nil
}

// GetFileType returns the file extension
func (s *FileParserService) GetFileType(filename string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".txt" && ext != ".md" {
		return "", &FileUploadError{
			Code:    "invalid_type",
			Message: "Only .txt and .md files allowed",
		}
	}
	return ext, nil
}

// ParseFile parses a file and returns sections based on file type
func (s *FileParserService) ParseFile(filename string, content []byte) ([]ParsedMemorySection, error) {
	fileType, err := s.GetFileType(filename)
	if err != nil {
		return nil, err
	}

	switch fileType {
	case ".txt":
		return s.parseTxtFile(filename, content)
	case ".md":
		return s.parseMarkdownFile(filename, content)
	default:
		return nil, &FileUploadError{
			Code:    "invalid_type",
			Message: "Only .txt and .md files allowed",
		}
	}
}

// parseTxtFile treats the entire file content as a single memory
func (s *FileParserService) parseTxtFile(filename string, content []byte) ([]ParsedMemorySection, error) {
	text := strings.TrimSpace(string(content))
	if text == "" {
		return nil, &FileUploadError{
			Code:    "empty_file",
			Message: "File is empty",
		}
	}

	return []ParsedMemorySection{
		{
			Content: text,
			Heading: filename,
			Order:   0,
		},
	}, nil
}

// parseMarkdownFile splits markdown content by # and ## headings
func (s *FileParserService) parseMarkdownFile(filename string, content []byte) ([]ParsedMemorySection, error) {
	text := string(content)

	// Regex to match # or ## headings (not ###)
	headingRegex := regexp.MustCompile(`(?m)^(#{1,2})\s+(.+)$`)

	matches := headingRegex.FindAllStringSubmatchIndex(text, -1)

	// If no headings found, treat entire file as single section
	if len(matches) == 0 {
		trimmed := strings.TrimSpace(text)
		if trimmed == "" {
			return nil, &FileUploadError{
				Code:    "empty_file",
				Message: "File is empty",
			}
		}
		return []ParsedMemorySection{
			{
				Content: trimmed,
				Heading: filename,
				Order:   0,
			},
		}, nil
	}

	sections := []ParsedMemorySection{}

	for i, match := range matches {
		// Extract heading text (capture group 2)
		headingText := text[match[4]:match[5]]

		// Find content between this heading and next (or EOF)
		contentStart := match[1] // End of heading line
		// Skip to next line
		if contentStart < len(text) && text[contentStart] == '\n' {
			contentStart++
		} else if contentStart < len(text)-1 && text[contentStart] == '\r' && text[contentStart+1] == '\n' {
			contentStart += 2
		}

		var contentEnd int
		if i < len(matches)-1 {
			contentEnd = matches[i+1][0] // Start of next heading
		} else {
			contentEnd = len(text)
		}

		content := strings.TrimSpace(text[contentStart:contentEnd])

		// Skip empty sections
		if content == "" {
			continue
		}

		sections = append(sections, ParsedMemorySection{
			Content: content,
			Heading: headingText,
			Order:   i,
		})
	}

	// If all sections were empty, return error
	if len(sections) == 0 {
		return nil, &FileUploadError{
			Code:    "empty_file",
			Message: "File contains no content",
		}
	}

	return sections, nil
}
