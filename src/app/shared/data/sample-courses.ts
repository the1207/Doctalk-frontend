export interface SampleCourse {
  id: number;
  title: string;
  category: string;
  content: string;
}

export const SAMPLE_COURSES: SampleCourse[] = [
  {
    id: -1,
    title: 'Intelligence Artificielle & Inférence Hybride (Gemini Nano & Cloud)',
    category: 'Informatique & IA',
    content: `CHAPITRE 1 : FONDEMENTS DE L'INFÉRENCE HYBRIDE
L'inférence hybride représente un paradigme d'intelligence artificielle où l'exécution des modèles de langage est distribuée de façon dynamique entre l'appareil local (on-device) et des serveurs cloud distants.

1. Avantages de l'exécution On-Device (ex: Gemini Nano dans Google Chrome) :
- Zéro latence réseau : Le traitement se déroule directement sur le processeur (NPU/GPU/CPU) local.
- Confidentialité absolue des données : Les données personnelles ou sensibles de l'utilisateur ne quittent jamais le terminal.
- Disponibilité hors-ligne (Offline-first) : Les requêtes d'analyse et de résumé fonctionnent même en l'absence de connexion Internet.
- Réduction drastique des coûts d'infrastructure : Aucune facturation de serveur d'inférence pour les tâches exécutées localement.

2. Rôle du Fallback Cloud (ex: Gemini 2.0 Flash via Firebase AI Logic) :
Les modèles on-device sont optimisés pour être légers (4 bits de quantification, paramètres restreints). Pour des tâches nécessitant un contexte textuel massif, un raisonnement mathématique complexe ou un traitement multimodal de haute précision, le système bascule automatiquement vers le cloud via Firebase AI Logic.

3. Sécurité avec Firebase App Check :
L'accès aux API d'inférence cloud depuis un client Web ou mobile expose traditionnellement le projet aux abus de quota. Firebase App Check protège les backends en attestant cryptographiquement de la légitimité du client appelant (par reCAPTCHA Enterprise, Debug Tokens ou attestation de plateforme), empêchant l'usurpation des clés API.`
  },
  {
    id: -2,
    title: 'Algorithmique Avancée & Structures de Données',
    category: 'Génie Logiciel',
    content: `COURS DE SYNTHÈSE : COMPLEXITÉ ET STRUCTURES FONDAMENTALES

1. Notation Grand O (Big-O) :
La complexité temporelle mesure la croissance du temps d'exécution en fonction de la taille de l'entrée n.
- O(1) : Temps constant (accès direct par index dans un tableau ou recherche par clé dans une table de hachage).
- O(log n) : Temps logarithmique (recherche dichotomique dans un tableau trié).
- O(n) : Temps linéaire (parcours séquentiel d'une liste chaînée).
- O(n log n) : Complexité optimale pour le tri par comparaisons (Tri Fusion / Merge Sort, Tri Rapide / QuickSort en moyenne).
- O(n²) : Complexité quadratique (Tri à bulles, double boucle imbriquée).

2. Arbres Binaires de Recherche (ABR / BST) :
Un ABR est un arbre où chaque nœud possède au plus deux enfants : le sous-arbre gauche contient des clés strictement inférieures, et le sous-arbre droit des clés strictement supérieures.
Dans le cas équilibré (Arbres AVL, Arbres Rouge-Noir), la recherche, l'insertion et la suppression s'effectuent en O(log n). Dans le pire cas dégénéré (arbre semblable à une liste), la complexité chute à O(n).

3. Tables de Hachage et Gestion des Collisions :
Une table de hachage associe des clés à des valeurs au moyen d'une fonction de hachage.
Les deux techniques majeures de résolution des collisions sont :
- Le chaînage séparé (Separate Chaining) : chaque alvéole contient une liste chaînée des éléments ayant la même empreinte de hachage.
- L'adressage ouvert (Open Addressing) : en cas de collision, l'algorithme sonde les cases suivantes (sondage linéaire, quadratique ou double hachage).`
  },
  {
    id: -3,
    title: 'Architecture des Systèmes Distribués & Cloud Computing',
    category: 'Systèmes & Réseaux',
    content: `MODULE : ARCHITECTURE DES SYSTÈMES DISTRIBUÉS MODERNES

1. Le Théorème CAP (Conjecture de Brewer) :
Dans tout système informatique distribué avec partitionnement réseau, il est théoriquement impossible de garantir simultanément les trois propriétés suivantes :
- Cohérence (Consistency) : Chaque lecture reçoit l'écriture la plus récente ou une erreur.
- Disponibilité (Availability) : Chaque requête non défaillante reçoit une réponse valide sans garantie d'être la plus récente.
- Tolérance au partitionnement (Partition Tolerance) : Le système continue de fonctionner malgré la perte ou le retard de messages entre les nœuds du réseau.
Dans le monde réel, le partitionnement réseau (P) est inévitable ; une architecture distribuée doit donc choisir entre CP (Cohérence + Tolérance) et AP (Disponibilité + Tolérance).

2. Modèle de Consistance Éventuelle (Eventual Consistency) :
Adopté par les bases de données NoSQL distribuées (comme Apache Cassandra ou DynamoDB), ce modèle garantit que si aucune nouvelle mise à jour n'a lieu, tous les réplicas convergeront vers le même état au terme d'un certain délai.

3. Microservices vs Monolithes :
L'architecture microservices découpe une application en une suite de services indépendants déployables séparément, communiquant par API REST ou files de messages asynchrones (ex: Kafka, RabbitMQ). Bien qu'elle améliore la scalabilité et l'autonomie des équipes, elle introduit une complexité inhérente : traçabilité distribuée, gestion des transactions distribuées (Saga pattern) et latence inter-services.`
  }
];
