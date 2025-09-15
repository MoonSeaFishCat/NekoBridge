package utils

import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	
	"golang.org/x/crypto/bcrypt"
)

// Ed25519Signer Ed25519签名器
type Ed25519Signer struct {
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
}

// NewEd25519Signer 创建Ed25519签名器
func NewEd25519Signer() (*Ed25519Signer, error) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	return &Ed25519Signer{
		privateKey: privateKey,
		publicKey:  publicKey,
	}, nil
}

// GenerateSignature 生成签名
func (s *Ed25519Signer) GenerateSignature(secret, eventTs, plainToken string) (map[string]string, error) {
	// 使用botSecret生成确定性密钥
	seed := secret
	for len(seed) < ed25519.SeedSize {
		seed = strings.Repeat(seed, 2)
	}
	seed = seed[:ed25519.SeedSize]
	reader := strings.NewReader(seed)
	
	// GenerateKey 方法会返回公钥、私钥，这里只需要私钥进行签名生成不需要返回公钥
	_, privateKey, err := ed25519.GenerateKey(reader)
	if err != nil {
		return nil, fmt.Errorf("ed25519 generate key failed: %v", err)
	}
	
	// 构建待签名消息 - 按照参考实现：eventTs + plainToken
	var msg bytes.Buffer
	msg.WriteString(eventTs)
	msg.WriteString(plainToken)
	
	// 使用私钥签名
	signature := hex.EncodeToString(ed25519.Sign(privateKey, msg.Bytes()))
	
	return map[string]string{
		"plain_token": plainToken,
		"signature":   signature,
	}, nil
}

// VerifySignature 验证签名
func (s *Ed25519Signer) VerifySignature(secret, eventTs, plainToken, signature string) bool {
	// 使用botSecret生成确定性密钥
	seed := secret
	for len(seed) < ed25519.SeedSize {
		seed = strings.Repeat(seed, 2)
	}
	seed = seed[:ed25519.SeedSize]
	reader := strings.NewReader(seed)
	
	// 生成密钥对
	publicKey, _, err := ed25519.GenerateKey(reader)
	if err != nil {
		return false
	}
	
	// 构建待签名消息 - 按照参考实现：eventTs + plainToken
	var msg bytes.Buffer
	msg.WriteString(eventTs)
	msg.WriteString(plainToken)
	
	// 解码签名
	sigBytes, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}
	
	// 验证签名
	return ed25519.Verify(publicKey, msg.Bytes(), sigBytes)
}

// GetPublicKey 获取公钥
func (s *Ed25519Signer) GetPublicKey() string {
	return hex.EncodeToString(s.publicKey)
}

// GetPrivateKey 获取私钥
func (s *Ed25519Signer) GetPrivateKey() string {
	return hex.EncodeToString(s.privateKey)
}

// HashPassword 使用bcrypt哈希密码
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash 验证密码哈希
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
