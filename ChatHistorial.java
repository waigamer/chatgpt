package com.galdevs.application.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "chat_historial")
public class ChatHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titulo;

    @ManyToOne
    @JoinColumn(name = "id_chat")
    private Chat chat;

    @Column(name = "creado")
    private LocalDateTime creado;

    @Column(name = "texto", columnDefinition = "TEXT")
    private String texto;

    @Column(name = "respuesta", columnDefinition = "TEXT")
    private String respuesta;
}