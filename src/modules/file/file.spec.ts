import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as hasha from 'hasha';

import { FileService } from './file.service';
import { S3Service } from './s3.service';
import { File, TypeFileEnum } from './file.entity';

describe('FileService', () => {
  let fileService: FileService;
  let fileRepository: Repository<File>;
  let s3Service: S3Service;
  let logger: Logger;

  const mockFileRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockS3Service = {
    writeFile: jest.fn(),
    getFile: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    fileService = module.get<FileService>(FileService);
    fileRepository = module.get<Repository<File>>(getRepositoryToken(File));
    s3Service = module.get<S3Service>(S3Service);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  describe('createOne', () => {
    it('should upload file to S3 and save to database', async () => {
      const revisionId = '507f1f77bcf86cd799439011';
      const fileData = Buffer.from('test file content');
      const fileId = '507f1f77bcf86cd799439012';
      const expectedHash = hasha(fileData, { algorithm: 'sha256' });

      const expectedFile: File = {
        id: fileId,
        revisionId,
        type: TypeFileEnum.BAL,
        size: fileData.length,
        hash: expectedHash,
        createdAt: new Date(),
      };

      mockS3Service.writeFile.mockResolvedValue(fileId);
      mockFileRepository.create.mockReturnValue(expectedFile);
      mockFileRepository.save.mockResolvedValue(expectedFile);

      const result = await fileService.createOne(revisionId, fileData);

      expect(mockS3Service.writeFile).toHaveBeenCalledWith(fileData);
      expect(mockFileRepository.create).toHaveBeenCalledWith({
        id: fileId,
        revisionId,
        type: TypeFileEnum.BAL,
        size: fileData.length,
        hash: expectedHash,
      });
      expect(mockFileRepository.save).toHaveBeenCalledWith(expectedFile);
      expect(result).toEqual(expectedFile);
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });

    it('should propagate S3 errors', async () => {
      const revisionId = '507f1f77bcf86cd799439011';
      const fileData = Buffer.from('test file content');
      const s3Error = new Error('S3 upload failed');

      mockS3Service.writeFile.mockRejectedValue(s3Error);

      await expect(fileService.createOne(revisionId, fileData)).rejects.toThrow(
        s3Error,
      );
      expect(mockFileRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOneByRevision', () => {
    it('should return file when found', async () => {
      const revisionId = '507f1f77bcf86cd799439011';
      const expectedFile: File = {
        id: '507f1f77bcf86cd799439012',
        revisionId,
        type: TypeFileEnum.BAL,
        size: 100,
        hash: 'abc123',
        createdAt: new Date(),
      };

      mockFileRepository.findOne.mockResolvedValue(expectedFile);

      const result = await fileService.findOneByRevision(revisionId);

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { revisionId, type: TypeFileEnum.BAL },
      });
      expect(result).toEqual(expectedFile);
    });

    it('should return null when file not found', async () => {
      const revisionId = '507f1f77bcf86cd799439011';

      mockFileRepository.findOne.mockResolvedValue(null);

      const result = await fileService.findOneByRevision(revisionId);

      expect(result).toBeNull();
    });
  });

  describe('findDataByRevision', () => {
    it('should return file data from S3', async () => {
      const revisionId = '507f1f77bcf86cd799439011';
      const fileId = '507f1f77bcf86cd799439012';
      const fileContent = Buffer.from('test file content');

      const file: File = {
        id: fileId,
        revisionId,
        type: TypeFileEnum.BAL,
        size: fileContent.length,
        hash: 'abc123',
        createdAt: new Date(),
      };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockS3Service.getFile.mockResolvedValue(fileContent);

      const result = await fileService.findDataByRevision(revisionId);

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { revisionId, type: TypeFileEnum.BAL },
      });
      expect(mockS3Service.getFile).toHaveBeenCalledWith(fileId);
      expect(result).toEqual(fileContent);
    });

    it('should throw 404 when file not found in database', async () => {
      const revisionId = '507f1f77bcf86cd799439011';

      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(fileService.findDataByRevision(revisionId)).rejects.toThrow(
        new HttpException(
          `Aucun fichier de type 'bal' associé à la révision ${revisionId}`,
          HttpStatus.NOT_FOUND,
        ),
      );

      expect(mockS3Service.getFile).not.toHaveBeenCalled();
    });

    it('should propagate S3 errors when file exists but S3 fails', async () => {
      const revisionId = '507f1f77bcf86cd799439011';
      const fileId = '507f1f77bcf86cd799439012';
      const s3Error = new HttpException(
        'Fichier non trouvé sur S3',
        HttpStatus.NOT_FOUND,
      );

      const file: File = {
        id: fileId,
        revisionId,
        type: TypeFileEnum.BAL,
        size: 100,
        hash: 'abc123',
        createdAt: new Date(),
      };

      mockFileRepository.findOne.mockResolvedValue(file);
      mockS3Service.getFile.mockRejectedValue(s3Error);

      await expect(fileService.findDataByRevision(revisionId)).rejects.toThrow(
        s3Error,
      );
    });
  });
});
