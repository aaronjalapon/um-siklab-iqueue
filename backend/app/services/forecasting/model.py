"""PyTorch LSTM model for surge prediction residual correction."""

from __future__ import annotations

import torch
import torch.nn as nn


class SurgeLSTM(nn.Module):
    """LSTM model for predicting daily passenger volume residuals.

    Architecture:
        LSTM(hidden=64, num_layers=2) → Linear(64, 32) → ReLU → Dropout(0.2) → Linear(32, 1)

    Input:
        (batch_size, seq_len=7, input_size=3)
        Features per time step:
          - passenger_volume (normalized)
          - day_of_week (0-6, normalized to 0-1)
          - is_holiday (0 or 1)

    Output:
        (batch_size, 1) — predicted residual (correction to Prophet baseline)
    """

    def __init__(
        self,
        input_size: int = 3,
        hidden_size: int = 64,
        num_layers: int = 2,
        output_size: int = 1,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.fc1 = nn.Linear(hidden_size, 32)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(32, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Input tensor of shape (batch_size, seq_len, input_size)

        Returns:
            Predicted residual of shape (batch_size, 1)
        """
        lstm_out, (hidden, _) = self.lstm(x)
        # Use the last hidden state
        last_hidden = hidden[-1]  # (batch_size, hidden_size)
        out = self.fc1(last_hidden)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        return out

    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """Inference mode prediction (no gradient tracking).

        Args:
            x: Input tensor of shape (batch_size, seq_len, input_size)

        Returns:
            Predicted residual as numpy-friendly 1D tensor
        """
        self.eval()
        with torch.no_grad():
            return self.forward(x).squeeze(-1)