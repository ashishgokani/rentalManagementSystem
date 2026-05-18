from sqlalchemy.orm import Session
from app.db.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus
from app.db.models.user import User
import uuid

class WalletService:
    def get_or_create_wallet(self, db: Session, user_id: uuid.UUID) -> Wallet:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0.0)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        return wallet

    def credit_wallet(self, db: Session, user_id: uuid.UUID, amount: float, description: str, reference_type: str = None, reference_id: str = None):
        if amount <= 0:
            return None
            
        wallet = self.get_or_create_wallet(db, user_id)
        balance_before = wallet.balance
        wallet.balance += amount
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.CREDIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            status=TransactionStatus.COMPLETED,
            reference_type=reference_type,
            reference_id=uuid.UUID(reference_id) if reference_id else None,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction

    def debit_wallet(self, db: Session, user_id: uuid.UUID, amount: float, description: str, reference_type: str = None, reference_id: str = None):
        if amount <= 0:
            return None
        
        wallet = self.get_or_create_wallet(db, user_id)
        if wallet.balance < amount:
            raise ValueError("Insufficient balance")
            
        balance_before = wallet.balance
        wallet.balance -= amount
        
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEBIT,
            amount=amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            status=TransactionStatus.COMPLETED,
            reference_type=reference_type,
            reference_id=uuid.UUID(reference_id) if reference_id else None,
            description=description
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction

wallet_service = WalletService()
