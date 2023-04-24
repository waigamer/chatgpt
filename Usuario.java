package com.galdevs.application.entities;



import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String nick;

    private String clave;

    @Column(name = "creado")
    private LocalDateTime creado;

    @Column(name = "modificado")
    private LocalDateTime modificado;

    @OneToMany(mappedBy = "usuario")
    private List<Chat> chats;
}
