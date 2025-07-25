package producer

import (
	"context"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type PdfHelperServiceProducer struct {
	KafkaWriterFunc func(topic string) *kafka.Writer
}

func NewPdfHelperServiceProducer(kafkaWriterFunc func(topic string) *kafka.Writer) *PdfHelperServiceProducer {
	return &PdfHelperServiceProducer{
		KafkaWriterFunc: kafkaWriterFunc,
	}
}

func (p *PdfHelperServiceProducer) Push(ctx context.Context, topic string, value []byte) error {
	log.Printf("Topic: %s", topic)

	writer := p.KafkaWriterFunc(topic)
	defer writer.Close()

	return writer.WriteMessages(ctx, kafka.Message{
		Key:   nil,
		Value: value,
		Time:  time.Now(),
	})
}
