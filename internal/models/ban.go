package models

import "time"

// BanInfo 封禁信息
type BanInfo struct {
	ID          int        `json:"id,omitempty"`
	Secret      string     `json:"secret"`
	Reason      string     `json:"reason,omitempty"`
	BannedAt    time.Time  `json:"bannedAt"`
	BannedBy    string     `json:"bannedBy"`
	UnbannedAt  *time.Time `json:"unbannedAt,omitempty"`
	UnbannedBy  string     `json:"unbannedBy,omitempty"`
	IsActive    bool       `json:"isActive,omitempty"`
	CreatedAt   time.Time  `json:"createdAt,omitempty"`
	UpdatedAt   time.Time  `json:"updatedAt,omitempty"`
}

// BlockedSecretsResponse 封禁密钥响应
type BlockedSecretsResponse struct {
	BlockedSecrets []string  `json:"blockedSecrets"`
	Bans           []BanInfo `json:"bans"`
	Total          int       `json:"total"`
}

// BlockSecretRequest 封禁密钥请求
type BlockSecretRequest struct {
	Reason string `json:"reason,omitempty"`
}
