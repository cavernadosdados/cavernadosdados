# Ficha resumida dentro de Mesas

## Objetivo
Permitir que cada jogador aceito mantenha uma ficha resumida por mesa, anexe um PDF e até quatro imagens, informe um link externo e consulte as fichas autorizadas sem sair da tela **Minhas Mesas**.

## Experiência na tela
- Adicionar a ação **Fichas** nos cards das mesas em que o usuário participa ou é mestre.
- Abrir um painel amplo sobre a própria tela, sem navegação para outra página.
- Jogador: criar e editar sua ficha com nome do personagem, classe/arquétipo, nível, espécie/raça, atributos principais, pontos de vida, defesa, observações e link externo.
- Mestre: visualizar as fichas dos jogadores aceitos na mesa, escolhendo o personagem por uma lista lateral ou menu no celular.
- Jogadores aceitos: visualizar as fichas compartilhadas daquela mesa; somente o dono edita a própria.
- Exibir PDF e imagens no próprio painel, com alternativa de abrir o documento em outra aba quando o navegador não oferecer prévia.
- Informar limites antes do envio: um PDF, até quatro imagens e 10 MB por arquivo.

## Privacidade e permissões
- Criar uma área privada de arquivos para fichas.
- Permitir leitura somente ao dono da ficha, mestre da mesa e jogadores com candidatura aceita na mesma mesa.
- Permitir criação, alteração e remoção somente ao dono da ficha; o mestre terá leitura, não edição.
- Validar no banco que o dono da ficha é um jogador aceito e que cada jogador possui apenas uma ficha por mesa.
- Validar tipo e tamanho também na interface, sem depender apenas dela para segurança.

## Implementação técnica
- Criar a tabela de fichas com campos resumidos e uma lista controlada de anexos.
- Criar funções de autorização reutilizáveis e políticas de acesso para dados e arquivos privados.
- Criar o bucket privado e organizar arquivos por `mesa/jogador`.
- Gerar links temporários para visualizar PDF e imagens sem torná-los públicos.
- Criar um componente único de painel de fichas e integrá-lo aos cards de mestre e jogador.
- Atualizar tipos e consultas após a mudança do banco.

## Validação
- Testar criação e edição da própria ficha, substituição e remoção de anexos.
- Testar PDF, imagens, link externo e limites de quantidade/tamanho.
- Confirmar que mestre e jogadores aceitos visualizam sem sair de Mesas.
- Confirmar que pendentes, recusados e usuários externos não acessam dados nem arquivos.
- Verificar desktop, celular, acessibilidade, erros no navegador e compilação.
