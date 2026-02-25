class BookingModel {
  final String id;
  final String serviceName;
  final String serviceIcon;
  final double price;
  final int durationMinutes;
  final DateTime dateTime;
  final String clientName;
  final String clientEmail;
  final String clientPhone;
  final String? notes;
  final BookingStatus status;
  final DateTime createdAt;

  const BookingModel({
    required this.id,
    required this.serviceName,
    required this.serviceIcon,
    required this.price,
    required this.durationMinutes,
    required this.dateTime,
    required this.clientName,
    required this.clientEmail,
    required this.clientPhone,
    this.notes,
    this.status = BookingStatus.confirmed,
    required this.createdAt,
  });

  BookingModel copyWith({
    BookingStatus? status,
  }) {
    return BookingModel(
      id: id,
      serviceName: serviceName,
      serviceIcon: serviceIcon,
      price: price,
      durationMinutes: durationMinutes,
      dateTime: dateTime,
      clientName: clientName,
      clientEmail: clientEmail,
      clientPhone: clientPhone,
      notes: notes,
      status: status ?? this.status,
      createdAt: createdAt,
    );
  }

  DateTime get endTime => dateTime.add(Duration(minutes: durationMinutes));

  bool get isUpcoming => dateTime.isAfter(DateTime.now());

  bool get isToday {
    final now = DateTime.now();
    return dateTime.year == now.year &&
        dateTime.month == now.month &&
        dateTime.day == now.day;
  }

  /// Parse from API JSON
  factory BookingModel.fromApi(Map<String, dynamic> json) {
    // Parse date + time
    final dateStr = json['date'] ?? '';
    final timeStr = json['time'] ?? '00:00';
    final parts = timeStr.split(':');
    DateTime dt;
    try {
      dt = DateTime.parse(dateStr);
      dt = DateTime(dt.year, dt.month, dt.day,
          int.tryParse(parts[0]) ?? 0, int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0);
    } catch (_) {
      dt = DateTime.now();
    }

    return BookingModel(
      id: json['id'] ?? '',
      serviceName: json['serviceName'] ?? '',
      serviceIcon: json['serviceIcon'] ?? '✂️',
      price: (json['price'] ?? 0).toDouble(),
      durationMinutes: json['duration'] ?? 30,
      dateTime: dt,
      clientName: json['clientName'] ?? '',
      clientEmail: json['clientEmail'] ?? '',
      clientPhone: json['clientPhone'] ?? '',
      notes: json['notes'],
      status: _parseStatus(json['status']),
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  static BookingStatus _parseStatus(String? s) {
    switch (s) {
      case 'pending':
        return BookingStatus.pending;
      case 'confirmed':
        return BookingStatus.confirmed;
      case 'in_progress':
        return BookingStatus.inProgress;
      case 'completed':
        return BookingStatus.completed;
      case 'cancelled':
        return BookingStatus.cancelled;
      default:
        return BookingStatus.confirmed;
    }
  }

  String get statusString {
    switch (status) {
      case BookingStatus.pending:
        return 'pending';
      case BookingStatus.confirmed:
        return 'confirmed';
      case BookingStatus.inProgress:
        return 'in_progress';
      case BookingStatus.completed:
        return 'completed';
      case BookingStatus.cancelled:
        return 'cancelled';
    }
  }
}

enum BookingStatus {
  pending,
  confirmed,
  inProgress,
  completed,
  cancelled;

  String get label {
    switch (this) {
      case BookingStatus.pending:
        return 'En attente';
      case BookingStatus.confirmed:
        return 'Confirmé';
      case BookingStatus.inProgress:
        return 'En cours';
      case BookingStatus.completed:
        return 'Terminé';
      case BookingStatus.cancelled:
        return 'Annulé';
    }
  }

  String get emoji {
    switch (this) {
      case BookingStatus.pending:
        return '⏳';
      case BookingStatus.confirmed:
        return '✅';
      case BookingStatus.inProgress:
        return '✂️';
      case BookingStatus.completed:
        return '✨';
      case BookingStatus.cancelled:
        return '❌';
    }
  }
}

class ServiceModel {
  final String id;
  final String name;
  final String icon;
  final double price;
  final int durationMinutes;
  final String description;

  const ServiceModel({
    required this.id,
    required this.name,
    required this.icon,
    required this.price,
    required this.durationMinutes,
    required this.description,
  });

  static const List<ServiceModel> defaultServices = [
    ServiceModel(
      id: 'coupe',
      name: 'Coupe Classique',
      icon: '✂️',
      price: 25,
      durationMinutes: 30,
      description: 'Coupe précise et élégante, adaptée à votre style.',
    ),
    ServiceModel(
      id: 'barbe',
      name: 'Taille de Barbe',
      icon: '🪒',
      price: 15,
      durationMinutes: 20,
      description: 'Sculpture et entretien avec produits haut de gamme.',
    ),
    ServiceModel(
      id: 'premium',
      name: 'Pack Premium',
      icon: '💎',
      price: 55,
      durationMinutes: 60,
      description: 'Coupe + barbe + soin du visage.',
    ),
    ServiceModel(
      id: 'coloration',
      name: 'Coloration',
      icon: '🎨',
      price: 40,
      durationMinutes: 45,
      description: 'Coloration professionnelle, naturelle ou audacieuse.',
    ),
    ServiceModel(
      id: 'soin',
      name: 'Soin Capillaire',
      icon: '🧴',
      price: 30,
      durationMinutes: 35,
      description: 'Traitement profond pour revitaliser vos cheveux.',
    ),
    ServiceModel(
      id: 'enfant',
      name: 'Coupe Enfant',
      icon: '👶',
      price: 18,
      durationMinutes: 25,
      description: 'Coupe adaptée aux moins de 12 ans.',
    ),
  ];
}
