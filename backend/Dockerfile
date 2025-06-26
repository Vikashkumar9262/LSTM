# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /code

# Install system dependencies needed for TA-Lib
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and install TA-Lib from source
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xvzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib*

# Add the TA-Lib library paths to the environment so the Python wrapper can find it
ENV TA_INCLUDE_PATH=/usr/include
ENV TA_LIBRARY_PATH=/usr/lib

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies
# We use TA-Lib now which will build from the source we just installed
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the backend application code into the container
COPY . /code

# Expose the port the app runs on (Render will use this)
EXPOSE 8000

# Define the command to run the app. Render will override this with its own start command,
# but it's good practice to have it. The PORT environment variable is set by Render.
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"] 