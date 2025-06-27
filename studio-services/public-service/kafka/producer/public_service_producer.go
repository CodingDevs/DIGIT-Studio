package producer

import (
	"context"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type PublicServiceProducer struct {
	KafkaWriterFunc func(topic string) *kafka.Writer
}

func NewPublicServiceProducer(kafkaWriterFunc func(topic string) *kafka.Writer) *PublicServiceProducer {
	return &PublicServiceProducer{
		KafkaWriterFunc: kafkaWriterFunc,
	}
}

func (p *PublicServiceProducer) Push(ctx context.Context, topic string, value []byte) error {
	log.Printf("Topic: %s", topic)

	writer := p.KafkaWriterFunc(topic)
	defer writer.Close()

	return writer.WriteMessages(ctx, kafka.Message{
		Key:   nil,
		Value: value,
		Time:  time.Now(),
	})
}
